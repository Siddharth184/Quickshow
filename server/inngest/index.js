import { Inngest } from "inngest";
import User from "../models/User.js";
import Booking from "../models/Booking.js";
import Show from "../models/Show.js";
import sendEmail from "../configs/nodeMailer.js";

export const inngest = new Inngest({ id: "movie-ticket-booking" });

const syncUserCreation = inngest.createFunction(
    {id: 'sync-user-from-clerk'},
    {event: 'clerk/user.created'},
    async ({ event }) =>{
        const{id, first_name, last_name, email_addresses, image_url} = event.data
        const userData = {
            _id: id,
            email:email_addresses[0].email_address,
            name: first_name + ' ' + last_name,
            image: image_url
        }
        await User.create(userData)
    }
)

// Inngest Function to delete Userfrom database
const syncUserDeletion = inngest.createFunction(
    {id: 'delete-user-with-clerk'},
    {event: 'clerk/user.deleted'},
    async ({ event }) =>{
       const {id} = event.data
       await User.findByIdAndDelete(id);
    }
)

const syncUserUpdation = inngest.createFunction(
    {id: 'update-user-from-clerk'},
    {event: 'clerk/user.updated'},
    async ({ event }) =>{
         const{id, first_name, last_name, email_addresses, image_url} = event.data
        const userData = {
            _id: id,
            email:email_addresses[0].email_address,
            name: first_name + ' ' + last_name,
            image: image_url
        }
        await User.findByIdAndUpdate(id, userData);

    }
)

// Inngest Function to cancel booking and release seats of show after 10 minutes of booking created if  payment in not made
const releaseSeatsAndDeleteBooking = inngest.createFunction(
    {id: 'release-seat-delete-booking'},
    {event: "app/checkpayment"},
    async ({event, step}) => {
        const tenMinutesLater = new Date(Date.now() + 10 * 60 * 1000);
        await step.sleepUntil('wait-for-10-minutes', tenMinutesLater);

        await step. run ('check-payment-status', async () =>{
            const bookingId = event.data.bookingId;
            const booking = await Booking.findById(bookingId)

            // if payment is not made , release seats and delete booking
            if(!booking.isPaid){
                const show = await Show.findById(booking.show);
                booking.bookedSeats.forEach((seat) => {
                    delete show.occupiedSeats[seat]
                });
                show.markModified('occupiedSeats')
                await show.save()
                await Booking.findByIdAndDelete(booking._id)
            }
         })

    }
)

const sendBookingConfirmationEmail = inngest.createFunction(
    {id: "send-booking-confirmation-email"},
    {event: "app/show.booked"},
    async ({ event, step}) => {
        const { bookingId } = event.data;

        const booking = await  Booking.findById(bookingId).populate({
            path: "show",
            populate: {path: "movie", model: "Movie"}
        }).populate('user');

        await sendEmail({
            to: booking.user.email,
            subject: `Payment Confirmation: "${booking.show.movie.title}" booked!`,
            body: `
            <div style="max-width:600px;margin:auto;padding:20px;font-family:sans-serif;border:1px solid #ddd;border-radius:8px;background:#f9f9f9;">
        <h2 style="text-align:center;background:#1c1c1c;color:#fff;padding:15px;border-radius:5px 5px 0 0;">
          🎟️ Booking Confirmed!
        </h2>
        <p>Hello <strong>${booking.user.name}</strong>,</p>
        <p>Thank you for booking with <strong>CinemaX</strong>. Your payment has been received and your movie ticket is confirmed.</p>

        <div style="background:#fff;padding:15px;border:1px dashed #aaa;margin:20px 0;border-radius:5px">
          <p><strong>Movie:</strong> ${booking.show.movie.title}</p>
          <p><strong>Date:</strong> ${booking.show.date}</p>
          <p><strong>Time:</strong> ${booking.time}</p>
          <p><strong>Seats:</strong> ${booking.bookedSeats.join(", ")}</p>
          <p><strong>Screen:</strong> ${booking.show.theater.name}</p>
          <p><strong>Booking ID:</strong> ${booking._id}</p>
          <p><strong>Total Paid:</strong> ₹${booking.totalAmount}</p>
        </div>

        <p>Please bring this email to the theatre or scan your ticket QR code (if available) at the entrance.</p>

        <a href="https://yourdomain.com/my-bookings" style="background:#e50914;color:#fff;padding:10px 20px;text-decoration:none;border-radius:4px;display:inline-block;margin-top:15px;">
          View Your Booking
        </a>

        <p style="font-size:12px;color:#666;margin-top:30px">If you didn’t make this booking, please contact support immediately.</p>
        <p style="text-align:center;font-size:12px;color:#aaa;margin-top:30px">© 2025 CinemaX. All rights reserved.</p>
      </div>`,
        })
    }
)

const sendShowReminders = inngest.createFunction(
    {id: "send-show-reminders"},
    {cron: "0 */8 * * *"},
    async ({ step }) =>{
        const now = new Date();
        const in8Hours = new Date(now.getTime() + 8 * 60 * 60* 1000);
        const windowStart = new Date(in8Hours.getTime() - 10 * 60 * 1000);

        // Prepare reminder tasks
        const reminderTasks = await step.run("prepare-reminder-tasks", async ()=>{
            const shows = await Show.find({
                showTime: { $gte: windowStart, $lte: in8Hours },
            }).populate('movie')

            const tasks = [];

            for(const show of shows){
                if(!show.movie || !show.occupiedSeats) continue;

                const userIds = [...new Set(Object.values(show.occupiedSeats))];
                if(userIds.length === 0) continue;

                const users = await User.find({_id: {$in: userIds}}).select("name email");

                for(const user of users){
                    tasks.push({
                        userEmail: user.email,
                        userName: user.name,
                        movieTitle: show.movie.title,
                        showTime: show.showTime,
                    })
                }
            }
            return tasks;
        })

        if(reminderTasks.length === 0){
            return {sent: 0, message: "No reminder to send."}
        }

        // send reminder emails
        const results = await step.run("send-all-reminders", async () => {
            return await Promise.allSettled(
                reminderTasks.map(task => sendEmail({
                    to: task.userEmail,
                    subject: `Reminder: Your movie "${task.movieTitle}" start soon!`,
                    body: `
                    <div style="max-width:600px;margin:auto;padding:20px;font-family:sans-serif;border:1px solid #ddd;border-radius:8px;background:#fdfdfd;">
                <h2 style="text-align:center;background:#ff9900;color:#fff;padding:15px;border-radius:5px 5px 0 0;">
                  🎬 Upcoming Movie Reminder
                </h2>
                
                <p>Hello <strong>${task.userName}</strong>,</p>
                <p>This is a reminder that your movie <strong>"${task.movieTitle}"</strong> is starting soon!</p>

                <div style="background:#fff;padding:15px;border:1px dashed #aaa;margin:20px 0;border-radius:5px">
                  <p><strong>Movie:</strong> ${task.movieTitle}</p>
                  <p><strong>Show Time:</strong> ${new Date(task.showTime).toLocaleString()}</p>
                </div>

                <p>Please arrive at the theatre at least 15–20 minutes before the showtime to avoid missing the start.</p>

                <a href="https://yourdomain.com/my-bookings" style="background:#e50914;color:#fff;padding:10px 20px;text-decoration:none;border-radius:4px;display:inline-block;margin-top:15px;">
                  View My Bookings
                </a>

                <p style="font-size:12px;color:#666;margin-top:30px">If you didn’t make this booking, please contact support immediately.</p>
                <p style="text-align:center;font-size:12px;color:#aaa;margin-top:30px">© 2025 CinemaX. All rights reserved.</p>
              </div>
                    
                    `
                }))
            )
        })
           const sent= results.filter(r => r.status === "fulfilled").length;
           const failed= results.length - sent ;

           return {
            sent,
            failed,
            message: `Sent ${sent} reminder(s), ${failed} failed.`
           }
    }
)

//Inngest Function  to send  notifications when a new show is added
const sendNewShowNotifications = inngest.createFunction(
    {id: "send-new-show-notifications"},
    {event: "app/show.added"},
    async ({ event }) => {
        const { movieTitle } = event.data;

        const users = await User.find({})

        for(const user of users){
            const userEmail  = user.email;
            const userName = user.name;

            const subject = `🎬 New Show Added: ${movieTitle}`;
            const body = `
            <div style="font-family:sans-serif;padding:20px;background:#f5f5f5;border-radius:8px;max-width:600px;margin:auto;">
            <h2> hi ${userName}, </h2>
            <P> We've just added a new show to our library:</p>
            <h3 style="color:#F84565;">" ${movieTitle}"</h3>
            <p> Visit our website </p>
            <br/>
            <p> Thanks, <br/> Team Siddharth❤️</p>
  
            </div>`;

            await sendEmail({
            to: userEmail,
            subject,
            body
        })
        }
        return {message: "Notifications sent."}
       
    }
)


export const functions = [
    syncUserCreation,
    syncUserDeletion,
    syncUserUpdation,
    releaseSeatsAndDeleteBooking,
    sendBookingConfirmationEmail,
    sendShowReminders,
    sendNewShowNotifications

];
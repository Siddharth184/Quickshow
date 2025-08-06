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
    {id: "sent-booking-confirmation-email"},
    {event: "app/show.booked"},
    async ({ event, step}) => {
        const { bookingId } = event.data;

        const booking = await  Booking.findById(bookingId).populate({
            path: "show",
            populate: {path: "movie", model: "Movie"}
        }).populate('user');

        await sendEmail({
            to: booking.user.email,
            subject: `Payment Confirmation: "${booking.show.movies.title}" booked!`,
            body: `
            <div style="max-width:600px;margin:auto;padding:20px;font-family:sans-serif;border:1px solid #ddd;border-radius:8px;background:#f9f9f9;">
      <h2 style="text-align:center;background:#1c1c1c;color:#fff;padding:15px;border-radius:5px 5px 0 0;">
        🎟️ Booking Confirmed!
      </h2>
      <p>Hello <strong>${booking.user.name}</strong>,</p>
      <p>Thank you for booking with <strong>CinemaX</strong>. Your payment has been received and your movie ticket is confirmed.</p>

      <div style="background:#fff;padding:15px;border:1px dashed #aaa;margin:20px 0;border-radius:5px">
        <p><strong>Movie:</strong> ${booking.show.movies.title}</p>
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
    </div>
            `
        })
    }
)


export const functions = [
    syncUserCreation,
    syncUserDeletion,
    syncUserUpdation,
    releaseSeatsAndDeleteBooking,
    sendBookingConfirmationEmail

];
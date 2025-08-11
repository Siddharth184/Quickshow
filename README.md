# 🎬 QUICKSHOW

**QUICKSHOW** is a full-stack movie booking platform built with a React (Vite) frontend and a Node.js/Express backend.  
It provides an interactive movie browsing experience, secure authentication, smooth ticket booking, and online payments — all deployed on Vercel.  

---

## 📌 Features
- 🔐 **Secure Authentication** with Clerk
- 🎥 **Movie Data** powered by TMDB API
- 🛒 **Ticket Booking & Management**
- 💳 **Payment Integration** with Stripe
- 📩 **Email Notifications** using Brevo
- ⚡ **Serverless Task Scheduling & Workflows** with Inngest
- ☁️ **Deployed on Vercel** for fast, scalable hosting

---

## 🛠 Tech Stack
**Frontend:** React (Vite), React Router, Clerk Auth, TMDB API  
**Backend:** Node.js, Express.js, MongoDB  
**Deployment:** Vercel  
**Payment:** Stripe  
**Email:** Brevo  
**Background Jobs:** Inngest

---

## 🔗 Third-Party Tools & Why We Used Them

| Tool / Service | Purpose | Why We Used It |
|----------------|---------|----------------|
| **Clerk** | Authentication & User Management | Handles secure login, signup, and session management with minimal setup and built-in UI components. |
| **Inngest** | Background Jobs & Event-Driven Workflows | Allows scheduling and running asynchronous tasks such as sending booking confirmations or reminders. |
| **TMDB (The Movie Database)** | Movie Data API | Fetches real-time movie details, posters, and descriptions for an up-to-date movie catalog. |
| **Stripe** | Payment Gateway | Securely processes ticket payments with card support and webhooks for transaction confirmation. |
| **Vercel** | Hosting & Deployment | Provides fast, serverless hosting for both frontend and backend with easy CI/CD. |
| **Brevo** | Email Delivery Service | Sends booking confirmations, payment receipts, and notifications directly to the user's email. |

* * *

## 🚀 Getting Started

### 1️⃣ Clone the Repository

    git clone https://github.com/your-username/quickshow.git
    cd quickshow

### 2️⃣ Install Dependencies

**Frontend**

    cd client
    npm install

**Backend**

    cd ../server
    npm install

### 3️⃣ Set Environment Variables

Create `.env` files in both `client` and `server` directories with the following keys:

**Frontend (**`**client/.env**`**)**

    VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
    VITE_TMDB_API_KEY=your_tmdb_api_key
    VITE_STRIPE_PUBLIC_KEY=your_stripe_public_key
    VITE_API_URL=http://localhost:5000

**Backend (**`**server/.env**`**)**

    CLERK_SECRET_KEY=your_clerk_secret_key
    TMDB_API_KEY=your_tmdb_api_key
    STRIPE_SECRET_KEY=your_stripe_secret_key
    BREVO_API_KEY=your_brevo_api_key
    MONGO_URI=your_mongo_connection_string

### 4️⃣ Run Locally

**Backend**

    cd server
    npm run dev

**Frontend**

    cd client
    npm run dev

Visit **http://localhost:5173**

* * *

## 📦 Deployment

This project is deployed on **Vercel**.  
Simply push changes to your GitHub repo, and Vercel will auto-deploy.

* * *

## 📜 License

This project is licensed under the **MIT License**.

* * *

## ✨ Author

Developed by **Siddhartha** 🚀

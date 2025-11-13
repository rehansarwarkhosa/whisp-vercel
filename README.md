# Whisp - Real-Time Chat Application

A modern, real-time chat application with admin approval system, built using Express.js, MongoDB, and Socket.io.

## Features

- **User Authentication**: Secure signup and login system
- **Admin Approval**: New users require admin approval before accessing chat
- **Real-Time Messaging**: Instant private chat using Socket.io
- **Admin Dashboard**: Manage users, approve signups, reset passwords
- **Responsive Design**: Mobile-friendly interface using Bootstrap 5
- **Message History**: Persistent chat history stored in MongoDB

## Quick Start

### Prerequisites

- Node.js (v14+)
- MongoDB

### Installation

1. Clone the repository
2. Install dependencies:

   ```bash
   npm install
   ```

3. Configure `.env` file with your settings:

   ```
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/whisp-chat
   SESSION_SECRET=your-secret-key
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=admin123
   ```

4. Start MongoDB

5. Run the application:

   ```bash
   npm start
   ```

6. Open `http://localhost:3000` in your browser

## Default Admin Account

- **Username**: admin (or as configured in .env)
- **Password**: admin123 (or as configured in .env)

## Usage

1. **New Users**: Sign up and wait for admin approval
2. **Admin**: Login to approve users and manage the system
3. **Approved Users**: Login and start chatting with other users

## Tech Stack

- Express.js
- MongoDB + Mongoose
- Socket.io
- EJS Templates
- Bootstrap 5
- bcryptjs

## License

Open source - Educational purposes

# 🤖 BudgetBrain AI Chatbot

A full-stack AI chatbot built with the MERN stack + Claude AI API.

## Tech Stack
- **MongoDB** — chat history storage
- **Express.js** — REST API backend
- **React.js** — frontend UI with dark/light mode
- **Node.js** — server runtime
- **Claude AI** — AI responses via Anthropic API

## Features
- 💬 Real-time AI chat
- 🌗 Dark / Light mode toggle
- 🗂️ Chat history saved to MongoDB
- 🔐 Basic auth (register/login)
- 📱 Responsive design

## Getting Started

### Prerequisites
- Node.js >= 18
- MongoDB (local or Atlas)
- Anthropic API key

### Installation

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/novamind-ai.git
cd novamind-ai

# Install server dependencies
cd server && npm install

# Install client dependencies
cd ../client && npm install
```

### Environment Variables

Create `/server/.env`:
```
PORT=5000
MONGO_URI=your_mongodb_connection_string
ANTHROPIC_API_KEY=your_anthropic_api_key
JWT_SECRET=your_jwt_secret
```

Create `/client/.env`:
```
VITE_API_URL=http://localhost:5000
```

### Run the App

```bash
# In /server
npm run dev

# In /client
npm run dev
```

Visit `http://localhost:5173`

## Folder Structure
```
novamind/
├── server/
│   ├── models/        # MongoDB schemas
│   ├── routes/        # Express routes
│   ├── controllers/   # Route logic
│   ├── middleware/    # Auth middleware
│   └── index.js       # Entry point
├── client/
│   ├── src/
│   │   ├── components/  # Reusable components
│   │   ├── pages/       # Page views
│   │   ├── context/     # React context
│   │   └── hooks/       # Custom hooks
│   └── index.html
└── README.md
```

## License
MIT

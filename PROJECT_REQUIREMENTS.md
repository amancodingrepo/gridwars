# Real-Time Shared Grid App - Project Requirements

## 🎯 Project Overview
Build a real-time collaborative grid application where multiple users can simultaneously claim blocks on a shared board. Think of it as a multiplayer canvas where everyone's actions are instantly visible to all other users.

---

## ✅ Core Functionality

### Grid/Map
- Display a grid with **hundreds of blocks** (tiles/pixels/cells)
- Blocks can be in two states:
  - **Unclaimed** (available to capture)
  - **Owned** (assigned to a specific user)

### User Interaction
- Users can **click any block to claim it**
- Once claimed, block gets assigned to that user
- All other users see the update **immediately**

### Multi-User Support
- Multiple users online simultaneously
- **Real-time synchronization** - changes visible to all instantly
- System must handle concurrent users without breaking

---

## 🏗️ Technical Requirements

### Frontend
- Clean, interactive UI **(this matters a lot!)**
- Visual clarity and smooth interactions
- Overall feel is important
- **Philosophy: Simple + clean > complex + messy**

### Backend
- Handle user sessions/connections
- Manage block ownership
- Resolve conflicts (what happens when multiple users try to claim the same block)
- Data persistence

### Real-Time Layer
- Use **WebSockets** (or similar technology like Socket.io, Server-Sent Events)
- Instant updates to all connected clients
- Efficient message broadcasting
- Handle connection drops gracefully

### Key Focus Areas
> **Important:** This project is explicitly looking for **backend + real-time thinking**, not just UI work

---

## 🎨 UI/UX Expectations

### Design Quality
This is **NOT** a "just make it work" task. We care about:
- Visual clarity
- Smooth interactions
- Overall feel and polish
- Intuitive user experience

### Design Philosophy
- Prioritize simplicity and cleanliness
- Avoid over-complication
- Focus on user experience fundamentals

---

## 🌟 Bonus Features (Optional, but impressive)

### User Identity
- User names
- User colors (for visual differentiation)
- Avatar or identifier system

### Game Mechanics
- **Cooldowns** (prevent spam clicking)
- **Lock time** (blocks locked for X seconds after claim)
- **Area control** rules (e.g., must claim adjacent blocks)
- Territory mechanics

### Analytics & Competition
- Leaderboard showing top users
- Statistics (blocks owned, claims made, etc.)
- Real-time user count

### Advanced UI
- **Zoom/pan** for navigating large maps
- Animations and micro-interactions
- Visual feedback for actions
- Smooth transitions

---

## 🛠️ Tech Stack

### Freedom of Choice
- Use whatever technologies you're comfortable with
- Choose appropriate tools for:
  - Frontend framework
  - Backend framework/runtime
  - Database
  - Real-time communication layer

### Document Your Choices
- Explain why you chose each technology
- Discuss trade-offs and alternatives considered
- Show understanding of the problem space

---

## 📊 Evaluation Criteria

### What We're Looking For:
1. **Thinking Process** - How you approach problems
2. **System Design** - Architecture and scalability considerations
3. **Real-Time Problem Solving** - Handling concurrency, conflicts, latency
4. **UI Sense** - Design quality and user experience
5. **Code Quality** - Clean, maintainable, well-structured code

### Success Metrics:
- **Quality over Quantity** - A smaller, well-built solution beats a huge half-done one
- **Completeness** - Core features working smoothly
- **Polish** - Attention to details in both code and UX
- **Technical Depth** - Understanding of real-time challenges and solutions

---

## 🤔 Technical Challenges to Consider

### Concurrency
- Multiple users claiming the same block simultaneously
- Race conditions
- Optimistic vs pessimistic locking

### State Management
- Client-side state synchronization
- Server as source of truth
- Handling stale state

### Real-Time Performance
- Message broadcasting efficiency
- Connection scaling
- Latency handling
- Reconnection strategy

### Data Persistence
- When to persist (every change? batched?)
- Database choice for fast reads/writes
- Handling server restarts

---

## 🚀 Getting Started Suggestions

### Phase 1: Foundation
1. Set up basic grid rendering
2. Implement click to claim (local only)
3. Create backend API for block state

### Phase 2: Real-Time
1. Add WebSocket connection
2. Implement server-side state management
3. Broadcast updates to all clients
4. Handle conflicts

### Phase 3: Polish
1. Add user identification
2. Improve UI/UX with animations
3. Add bonus features
4. Testing and bug fixes

---

## 📝 Deliverables

- **Working application** (deployed or locally runnable)
- **Source code** (clean, documented)
- **README** explaining:
  - How to run the project
  - Tech stack choices and reasoning
  - Architecture overview
  - Known limitations or future improvements
  - Any assumptions made

---

## 💡 Key Reminders

1. **UI matters** - Don't neglect the frontend experience
2. **Real-time is core** - This isn't just a CRUD app
3. **Conflicts are real** - Plan for concurrent access
4. **Smaller and polished** > Larger and incomplete
5. **Show your thinking** - Document decisions and trade-offs

---

Good luck! Remember: We're evaluating how you think and solve problems, not expecting perfection. Focus on building something that works well and shows your understanding of real-time systems and clean architecture.

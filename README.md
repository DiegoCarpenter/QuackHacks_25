# QuackHacks_25
UO Hackathon's smartest coders. 

**Polymates Lite:**

A Chrome extension that adds a simple social layer to Polymarket by allowing users to track wallet activity and view a real-time feed of trades.

**Overview:**

Polymates Lite introduces transparency and accessibility to prediction markets by enabling users to follow friends’ or notable traders’ Polymarket wallets. The extension displays a streamlined feed of recent trades, including market details, outcomes, prices, volumes, and timestamps. Users can open the corresponding Polymarket market directly from the feed to replicate or analyze the trade.

The extension is entirely client-side, requires no backend, and uses the Polymarket Data API to retrieve recent trade activity.

**Features:**

- Add and track any Polymarket wallet address.

- View a unified feed of recent trades across all tracked wallets.

- Access detailed trade information such as market title, outcome, side, price, and size.

- Open the corresponding Polymarket market through a direct link for manual trade replication.

- Local storage persistence for all saved wallets.

- Clean, dark-mode UI designed for Chrome’s popup environment.

- No backend or server dependencies.

**How It Works:**
- Wallet Tracking:
  - Users input one or more : wallet addresses. These addresses are validated locally and stored in the browser’s localStorage.

- Trade Retrieval:
  - For each added wallet, the extension queries the Polymarket Data API:
  - GET https://data-api.polymarket.com/trades?user=<wallet>&limit=20
  - The response includes metadata for each trade, which is normalized and combined into a single feed.

- Feed Rendering: Trades from all followed wallets are:
  - Merged into a single list.
  - Sorted by timestamp (newest first).
  - Displayed as structured cards within the extension UI.

- Copy Trade Flow:
  - Each trade card contains a reference to its associated Polymarket market. Selecting “Copy Trade” opens: https://polymarket.com/event/<eventSlug>
  - This allows users to review or replicate the trade on Polymarket’s interface.

**Installation:**

1. Clone or download this repository.
2. Open Google Chrome and navigate to: chrome://extensions
3. Enable Developer mode using the toggle in the top right corner.
4. Select Load unpacked.
5. Choose the project folder containing the extension files.
6. Pin the extension to your Chrome toolbar for quicker access.

**Project Structure**
polymates-lite/
│
├── manifest.json      # Chrome extension configuration
├── popup.html         # Main interface for the extension
├── popup.js           # Logic for wallet management and API requests
├── styles.css         # Styling for all UI components
└── README.md          # Project documentation


**Tech Stack:**
- Chrome Extension Manifest V3
- HTML, CSS, and JavaScript
- Polymarket Data API
- LocalStorage for persistence
- Client-side fetch operations only

**Roadmap:**
- Planned improvements include:
  - WebSocket-based real-time updates.
  - Notifications when tracked wallets execute new trades.
  - Wallet nicknames and profile tags.
  - Statistics for tracked wallets (win rate, volume, accuracy).
  - Private groups for collaborative tracking.
  - Integrated trade execution through the Polymarket Builder Program.

**Team:** 
- This project was developed by a four-person team with responsibilities divided across:
  - UI and styling
  - API integration and data handling
  - Chrome extension logic and storage
  - User experience, polish, and presentation

**License:** MIT License

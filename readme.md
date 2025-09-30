# Tourist Mobile App  

[![React Native](https://img.shields.io/badge/React%20Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactnative.dev/)  
[![Expo](https://img.shields.io/badge/Expo-1C1E24?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev/)  
[![Ethereum](https://img.shields.io/badge/Ethereum-3C3C3D?style=for-the-badge&logo=ethereum&logoColor=white)](https://ethereum.org/)  

---

## 📌 Problem Statement  

Tourism in regions like the Northeast is growing rapidly, but safety monitoring and incident response remain major challenges. Traditional systems are slow, manual, and lack transparency.  

This app is part of the **Smart Tourist Safety Monitoring & Incident Response System** which combines **AI, Blockchain, and Geo-fencing** to provide secure tourist tracking, safety alerts, and real-time response.  

---

## 📱 Tourist Mobile App  

The Tourist Mobile App is the **frontend for tourists**. It provides them with a **digital identity**, **safety score**, **live tracking options**, and **emergency features**.  

### ✨ Features and How They Work  

- **Digital Tourist ID Integration**  
  - When a tourist registers, the app connects with a **smart contract on Ethereum** using MetaMask.  
  - A blockchain-based digital ID is issued, storing KYC, trip details, and emergency contacts securely.  

- **Tourist Safety Score**  
  - The app calculates a safety score using travel history and locations visited.  
  - If the tourist enters a sensitive or high-risk area, the score lowers and the app shows a warning.  

- **Geo-fencing Alerts**  
  - The app uses GPS to check the tourist’s live location.  
  - If they cross into a **restricted or unsafe zone**, an alert is triggered for both the tourist and authorities.  

- **Panic Button (SOS)**  
  - A button in the app instantly shares the live location with **emergency contacts and the nearest police unit**.  
  - The SOS incident is also **recorded on the blockchain** for proof and quick response.  

- **Live Tracking (Opt-in)**  
  - Tourists can allow family or police to track their movements in real time.  
  - Useful in remote or risky areas.  

- **Anomaly Detection**  
  - The system flags unusual activity such as sudden location drop, long inactivity, or deviation from planned routes.  
  - These anomalies are sent to the dashboard for early intervention.  

- **Multilingual Support**  
  - The app supports **10+ Indian languages** plus English.  
  - Tourists can also use **voice or text emergency options** for accessibility.  

---

## 🖥️ Connection to Dashboard  

- The app sends important data to the **Police & Tourism Dashboard**:  
  - Tourist digital ID (from blockchain)  
  - Live location updates  
  - SOS alerts  
  - Anomaly warnings  

- The dashboard then shows:  
  - Tourist clusters and heatmaps  
  - Alerts for high-risk areas  
  - Auto e-FIR in missing cases  

---

## 🔗 Blockchain Integration  

- The app connects to **Ethereum blockchain** via MetaMask.  
- IDs are stored and verified on-chain to prevent tampering.  
- Smart Contracts are deployed using **Remix IDE**.  

---

## 🚀 How to Run the App Properly  

1. **Clone the repository**  
   ```bash
   git clone https://github.com/Neuro-Fox/Tourist-Mobile-App.git
   cd Tourist-Mobile-App
   npm install
   npm expo start

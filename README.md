# SmarterAPI

[![npm version](https://img.shields.io/npm/v/smarter_api.svg)](https://www.npmjs.com/package/smarter_api)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen.svg)](https://nodejs.org)

**SmarterAPI** is a high-performance, lightweight Node.js wrapper for the [Angel One SmartAPI](https://smartapi.angelbroking.com/) REST API. It is designed to provide a cleaner, more reliable, and developer-friendly alternative to the official SDK.

---

## ✨ Features

- ⚡ **Automated TOTP Generation**: Provide your TOTP secret key once; dynamic 6-digit 2FA codes are generated automatically during login.
- 🔄 **Built-in Resiliency & Retries**: Automatic retries with exponential backoff for network drops and `ECONNRESET` errors.
- 🌐 **Automatic Network Identification**: Fetches client public IP automatically to fulfill mandatory Angel One audit and security headers (`X-ClientPublicIP`, `X-ClientLocalIP`, `X-MACAddress`).
- 🚀 **Connection Pooling**: Configured with persistent HTTP keep-alive agents for faster subsequent API requests and lower latency.
- 📦 **Comprehensive API Coverage**: Full support for sessions, order placement, order management, portfolio holdings, positions, RMS limits, market quotes (LTP), scrip searching, and margin calculations.
- 🛠️ **Custom Endpoint Support**: Easily call any other Angel One endpoint with `makeSecureRequest()`.

---

## 📥 Installation

Install via npm:

```bash
npm install smarter_api
```

Or using yarn:

```bash
yarn add smarter_api
```

---

## 🔑 Prerequisites

Before using SmarterAPI, make sure you have:
1. An active [Angel One](https://www.angelone.in/) trading account.
2. An enabled developer account on [Angel One SmartAPI](https://smartapi.angelbroking.com/) with an API Key.
3. Your **Client Code** (User ID) and **MPIN** (PIN used to log in).
4. Your **TOTP Secret Key** (the base32 secret provided when setting up Authenticator 2FA on your Angel One account).

---

## 🚀 Quick Start

```javascript
const SmarterApi = require("smarter_api");

// 1. Initialize the client instance
const smarterApi = new SmarterApi();

const API_KEY = "your_smartapi_key";
const CLIENT_CODE = "your_client_code";
const MPIN = "your_mpin";
const TOTP_SECRET = "your_totp_secret_key";

async function main() {
  try {
    // 2. Authenticate and retrieve session JWT token
    console.log("Authenticating...");
    const jwtToken = await smarterApi.createSession(
      API_KEY,
      CLIENT_CODE,
      MPIN,
      TOTP_SECRET
    );
    console.log("Session created successfully!");

    // 3. Fetch RMS (Risk Management / Available Balance & Limits)
    const rms = await smarterApi.getRMS(API_KEY, jwtToken);
    console.log("Available Cash:", rms.data?.net);

    // 4. Fetch Portfolio Holdings
    const holdings = await smarterApi.getHoldings(API_KEY, jwtToken);
    console.log("Holdings:", holdings.data);

    // 5. Get Last Traded Price (LTP)
    const ltpData = await smarterApi.getLTP(
      {
        NSE: ["3045"], // SBIN-EQ token
      },
      API_KEY,
      jwtToken
    );
    console.log("LTP Data:", ltpData);
  } catch (error) {
    console.error("Error running SmarterAPI:", error.message || error);
  }
}

main();
```

---

## 📖 API Reference

### 1. Initialization

```javascript
const SmarterApi = require("smarter_api");
const smarterApi = new SmarterApi();
```
Upon instantiation, `SmarterApi` configures keep-alive sockets and initiates an asynchronous resolution of the host's public IP address.

---

### 2. Authentication & Session

#### `createSession(apiKey, username, mpin, totpToken)`
Logs into Angel One using client credentials and a TOTP secret, generating a valid JWT token.

- **Parameters:**
  - `apiKey` (`string`): Your Angel One SmartAPI key.
  - `username` (`string`): Your Angel One client code (e.g., `A123456`).
  - `mpin` (`string`): Your 4-digit or 6-digit MPIN.
  - `totpToken` (`string`): Base32 TOTP secret string (from 2FA setup).
- **Returns:** `Promise<string>` - The session `jwtToken`.

```javascript
const jwtToken = await smarterApi.createSession(
  apiKey,
  clientCode,
  mpin,
  totpSecret
);
```

---

### 3. Order Management

#### `placeOrder(apiKey, jwtToken, order)`
Places an equity or derivative order.

- **Parameters:**
  - `apiKey` (`string`): SmartAPI key.
  - `jwtToken` (`string`): Authenticated session token.
  - `order` (`object`): Order parameters.
- **Returns:** `Promise<object>` - API response with `orderid` and status.

**Order Parameters:**
| Field | Type | Description | Values / Examples |
| :--- | :--- | :--- | :--- |
| `variety` | `string` | Order variety | `"NORMAL"`, `"STOPLOSS"`, `"AMO"`, `"ROBO"` |
| `tradingsymbol` | `string` | Trading symbol of the scrip | `"SBIN-EQ"`, `"INFY-EQ"` |
| `symboltoken` | `string` | Unique instrument token | `"3045"` |
| `transactiontype` | `string` | Buy or Sell | `"BUY"`, `"SELL"` |
| `exchange` | `string` | Segment exchange | `"NSE"`, `"BSE"`, `"NFO"`, `"MCX"` |
| `ordertype` | `string` | Price condition | `"MARKET"`, `"LIMIT"`, `"STOPLOSS_LIMIT"`, `"STOPLOSS_MARKET"` |
| `producttype` | `string` | Product code | `"DELIVERY"`, `"CARRYFORWARD"`, `"INTRADAY"`, `"BO"`, `"CO"` |
| `duration` | `string` | Order validity | `"DAY"`, `"IOC"` |
| `price` | `string` | Limit price | `"0"` for MARKET, or exact limit e.g. `"750.50"` |
| `squareoff` | `string` | Target (for bracket orders) | `"0"` |
| `stoploss` | `string` | Trigger stoploss price | `"0"` |
| `quantity` | `string` | Number of shares / lots | `"1"`, `"50"` |

**Example:**
```javascript
const orderPayload = {
  variety: "NORMAL",
  tradingsymbol: "SBIN-EQ",
  symboltoken: "3045",
  transactiontype: "BUY",
  exchange: "NSE",
  ordertype: "LIMIT",
  producttype: "INTRADAY",
  duration: "DAY",
  price: "750.00",
  squareoff: "0",
  stoploss: "0",
  quantity: "1",
};

const response = await smarterApi.placeOrder(apiKey, jwtToken, orderPayload);
console.log("Order placed:", response);
```

#### `cancelOrder(apiKey, jwtToken, order)`
Cancels an open or pending order.

- **Parameters:**
  - `apiKey` (`string`): SmartAPI key.
  - `jwtToken` (`string`): Authenticated session token.
  - `order` (`object`): Object containing `variety` and `orderid`.
- **Returns:** `Promise<object>` - Cancellation response.

**Example:**
```javascript
const cancelPayload = {
  variety: "NORMAL",
  orderid: "24101900000001",
};

const response = await smarterApi.cancelOrder(apiKey, jwtToken, cancelPayload);
console.log("Cancelled:", response);
```

#### `getOrderBook(apiKey, jwtToken)`
Retrieves status and history for all orders placed during the trading day.

- **Returns:** `Promise<object>` - List of orders with statuses (`complete`, `open`, `rejected`, `cancelled`).

```javascript
const orderBook = await smarterApi.getOrderBook(apiKey, jwtToken);
console.log("Order Book:", orderBook.data);
```

---

### 4. Portfolio & Funds

#### `getHoldings(apiKey, jwtToken)`
Fetches long-term equity delivery holdings.

```javascript
const holdings = await smarterApi.getHoldings(apiKey, jwtToken);
console.log("Holdings:", holdings.data);
```

#### `getAllHoldings(apiKey, jwtToken)`
Fetches detailed holding metrics across the entire portfolio, including total investment value and current P&L.

```javascript
const allHoldings = await smarterApi.getAllHoldings(apiKey, jwtToken);
console.log("Total Portfolio Summary:", allHoldings.data);
```

#### `getPositions(apiKey, jwtToken)`
Fetches current intraday and carryforward derivative positions.

```javascript
const positions = await smarterApi.getPositions(apiKey, jwtToken);
console.log("Open Positions:", positions.data);
```

#### `getRMS(apiKey, jwtToken)`
Retrieves account balance, available margin, exposure, and limits from the Risk Management System.

```javascript
const rms = await smarterApi.getRMS(apiKey, jwtToken);
console.log("Net Available Limit:", rms.data?.net);
```

---

### 5. Market Data & Scrip Search

#### `getLTP(exchangeTokens, apiKey, jwtToken)`
Fetches real-time market quotes and Last Traded Price (LTP) for multiple tokens.

- **Parameters:**
  - `exchangeTokens` (`object`): Dictionary mapping exchanges (`"NSE"`, `"BSE"`, `"NFO"`, etc.) to arrays of token strings.
  - `apiKey` (`string`): SmartAPI key.
  - `jwtToken` (`string`): Authenticated session token.
- **Returns:** `Promise<Array<object>>` - Array of fetched market quote objects.

**Example:**
```javascript
const tokens = {
  NSE: ["3045", "1594"], // SBIN, INFY
  NFO: ["86700"],        // Options token
};

const quotes = await smarterApi.getLTP(tokens, apiKey, jwtToken);
quotes.forEach((q) => {
  console.log(`${q.tradingSymbol}: LTP ₹${q.ltp} (Change: ${q.change}%)`);
});
```

#### `searchScrip(exchange, searchscrip, jwtToken, apiKey)`
Searches for symbol tokens and instruments across exchanges.

> ⚠️ **Note parameter order:** `(exchange, searchscrip, jwtToken, apiKey)`

- **Parameters:**
  - `exchange` (`string`): `"NSE"`, `"BSE"`, `"NFO"`, `"MCX"`, etc.
  - `searchscrip` (`string`): Query string (e.g., `"RELIANCE"`, `"NIFTY"`).
  - `jwtToken` (`string`): Authenticated session token.
  - `apiKey` (`string`): SmartAPI key.

**Example:**
```javascript
const searchResult = await smarterApi.searchScrip(
  "NSE",
  "RELIANCE",
  jwtToken,
  apiKey
);
console.log("Matching Scrips:", searchResult.data);
```

---

### 6. Margins & Calculations

#### `calculateMargin(positions, apiKey, jwtToken)`
Calculates upfront margin requirements for a batch of prospective orders or positions before executing them.

- **Parameters:**
  - `positions` (`Array<object>`): Array of order objects to estimate margin for.
  - `apiKey` (`string`): SmartAPI key.
  - `jwtToken` (`string`): Authenticated session token.
- **Returns:** `Promise<object>` - Detailed margin calculation result.

**Example:**
```javascript
const positionsToEvaluate = [
  {
    exchange: "NSE",
    qty: 100,
    price: 750,
    productType: "INTRADAY",
    token: "3045",
    tradeType: "BUY",
  },
];

const marginData = await smarterApi.calculateMargin(
  positionsToEvaluate,
  apiKey,
  jwtToken
);
console.log("Required Margin:", marginData.data);
```

---

### 7. Custom Requests

#### `makeSecureRequest(url, method, apiKey, jwtToken, body = null)`
Execute any Angel One endpoint not explicitly wrapped by this library with all default security headers and retry behaviors pre-configured.

**Example:**
```javascript
const customResponse = await smarterApi.makeSecureRequest(
  "https://apiconnect.angelone.in/rest/secure/angelbroking/user/v1/getProfile",
  "GET",
  apiKey,
  jwtToken
);
console.log("User Profile:", customResponse.data);
```

---

## ⚙️ Architecture & Reliability

- **Keep-Alive Connection**: Uses `http.Agent({ keepAlive: true })` to prevent TCP handshake overhead across repeated calls.
- **Resilient Request Execution**: Requests failing with network disconnects (`ECONNRESET`) are retried up to 3 times automatically.
- **Header Generation**: Includes standard compliant headers expected by Angel One's security firewall:
  ```json
  {
    "X-UserType": "USER",
    "X-SourceID": "WEB",
    "X-ClientLocalIP": "192.168.1.123",
    "X-ClientPublicIP": "<auto-detected>",
    "X-MACAddress": "fe80::0211:22ff:fe33:4455",
    "X-PrivateKey": "<apiKey>",
    "Authorization": "Bearer <jwtToken>"
  }
  ```

---

## 🛡️ Error Handling Best Practices

Always wrap API calls in `try...catch` blocks to handle operational and network issues:

```javascript
try {
  const result = await smarterApi.placeOrder(apiKey, jwtToken, orderData);
  if (!result.status) {
    console.error("Order rejected by broker:", result.message);
  }
} catch (error) {
  console.error("Network or API error:", error.message);
}
```

---

## 📄 License

This project is licensed under the [ISC License](LICENSE).

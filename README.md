# SmarterAPI

SmarterAPI is a wrapper for the Angel SmartAPI Rest API, providing an improved interface over their own SDK. It simplifies interaction with the Angel Broking API, making it easier to manage sessions, place orders, retrieve holdings, positions, and more.

## Installation

To install SmarterAPI, you can use npm:  
`npm install smarter-api`

## Usage

First, import SmarterAPI into your project:

`const SmarterApi = require('smarter-api');`

### Creating a Session

To create a session (authenticate), use the `createSession` method:

`const jwtToken = await SmarterApi.createSession(apiKey, username, mpin, totpToken);`

Parameters:

- `apiKey`: Your API key.
- `username`: Your Angel Broking client code.
- `mpin`: Your Angel Broking MPIN.
- `totpToken`: Your TOTP token for two-factor authentication.

Returns:

- `jwtToken`: JWT token for authenticated session.

### Placing an Order

To place an order, use the `placeOrder` method:

`const orderResponse = await SmarterApi.placeOrder(apiKey, jwtToken, order);`

Parameters:

- `apiKey`: Your API key.
- `jwtToken`: JWT token obtained from the session creation.
- `order`: Order details in JSON format.

Returns:

- `orderResponse`: Response object from the API.

### Getting Holdings

To retrieve holdings, use the `getHoldings` method:

`const holdings = await SmarterApi.getHoldings(apiKey, jwtToken);`

Parameters:

- `apiKey`: Your API key.
- `jwtToken`: JWT token obtained from the session creation.

Returns:

- `holdings`: Holdings information.

### Getting All Holdings

To retrieve all holdings, use the `getAllHoldings` method:

`const allHoldings = await SmarterApi.getAllHoldings(apiKey, jwtToken);`

Parameters and Returns are similar to `getHoldings`.

### Getting Positions

To retrieve positions, use the `getPositions` method:

`const positions = await SmarterApi.getPositions(apiKey, jwtToken);`

Parameters and Returns are similar to `getHoldings`.

### Getting RMS

To retrieve risk management system (RMS) details, use the `getRMS` method:

`const rmsData = await SmarterApi.getRMS(apiKey, jwtToken);`

Parameters and Returns are similar to `getHoldings`.

## Notes

- Ensure you have a valid API key, client code, MPIN, and TOTP token for authentication.
- Always handle errors gracefully, and consider implementing error handling in your application.

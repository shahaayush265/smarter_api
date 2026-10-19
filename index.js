const { TOTP } = require("totp-generator");
const axios = require("axios");
const http = require("http");

const httpAgent = new http.Agent({ keepAlive: true });

class SmarterApi {
  constructor() {
    this.publicIp = "";
    this.privateIp = "192.168.1.123"; // Initialize private IP
    this.macAddress = "fe80::0211:22ff:fe33:4455"; // Initialize MAC Address
    this.retryCount = 3;
    this.fetchDetails();
  }

  async fetchDetails() {
    try {
      const response = await axios.get("https://httpbin.org/ip", { httpAgent });
      this.publicIp = response.data.origin;
    } catch (error) {
      console.error(`Error fetching details: ${error.message}`);
    }
  }

  async makeFetchRequest(url, method, api, jwtToken, body) {
    for (let i = 0; i <= this.retryCount; i++) {
      try {
        const requestOptions = {
          method,
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "X-UserType": "USER",
            "X-SourceID": "WEB",
            "X-ClientLocalIP": this.privateIp,
            "X-ClientPublicIP": this.publicIp,
            "X-MACAddress": this.macAddress,
            "X-PrivateKey": api,
            Authorization: `Bearer ${jwtToken}`,
          },
        };

        if (method !== "GET" && method !== "HEAD") {
          requestOptions.data = JSON.stringify(body);
        }

        const response = await axios.request({
          url,
          ...requestOptions,
        });

        return response.data;
      } catch (error) {
        if ((i = this.retryCount)) {
          return { error };
        }
        console.error(`Error: ${error.message}`);
        if (error.code === "ECONNRESET" && i < this.retryCount - 1) {
          console.log(`Retrying request (${i + 1}/${this.retryCount})...`);
          const delay = 1;
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          console.log(`Retrying request (${i + 1}/${this.retryCount})...`);
          const delay = 2000;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
  }

  async createSession(api, username, mpin, totp_token) {
    const { otp: totp } = TOTP.generate(totp_token);

    const fetchWithRetry = async () => {
      try {
        const response = await this.makeFetchRequest(
          "https://apiconnect.angelone.in/rest/auth/angelbroking/user/v1/loginByPassword",
          "POST",
          api,
          null,
          {
            clientcode: username,
            password: mpin,
            totp,
          },
        );

        if (response && response.data && response.data.jwtToken) {
          return response.data.jwtToken;
        }

        // If the response does not contain the JWT token, throw an error to trigger retry
        throw new Error("JWT token not found in the response");
      } catch (e) {
        throw new Error("JWT token not found in the response");
      }
    };

    try {
      return await fetchWithRetry(); // 3 retries with a 1-second delay
    } catch (error) {
      console.error("Error creating session after retries:", error);
      throw error;
    }
  }

  async makeSecureRequest(url, method, api, jwtToken, body = null) {
    try {
      const response = await this.makeFetchRequest(
        url,
        method,
        api,
        jwtToken,
        body,
      );
      return response;
    } catch (error) {
      console.error(`Error making secure ${method} request to ${url}:`, error);
      throw error;
    }
  }

  async placeOrder(api, jwtToken, order) {
    return await this.makeSecureRequest(
      "https://apiconnect.angelone.in/rest/secure/angelbroking/order/v1/placeOrder",
      "POST",
      api,
      jwtToken,
      order,
    );
  }

  async cancelOrder(api, jwtToken, order) {
    return await this.makeSecureRequest(
      "https://apiconnect.angelone.in/rest/secure/angelbroking/order/v1/cancelOrder",
      "POST",
      api,
      jwtToken,
      order,
    );
  }

  async getHoldings(api, jwtToken) {
    return await this.makeSecureRequest(
      "https://apiconnect.angelone.in/rest/secure/angelbroking/portfolio/v1/getHolding",
      "GET",
      api,
      jwtToken,
    );
  }

  async getAllHoldings(api, jwtToken) {
    return await this.makeSecureRequest(
      "https://apiconnect.angelone.in/rest/secure/angelbroking/portfolio/v1/getAllHolding",
      "GET",
      api,
      jwtToken,
    );
  }

  async getPositions(api, jwtToken) {
    return await this.makeSecureRequest(
      "https://apiconnect.angelone.in/rest/secure/angelbroking/order/v1/getPosition",
      "GET",
      api,
      jwtToken,
    );
  }

  async getRMS(api, jwtToken) {
    return await this.makeSecureRequest(
      "https://apiconnect.angelone.in/rest/secure/angelbroking/user/v1/getRMS",
      "GET",
      api,
      jwtToken,
    );
  }

  async getOrderBook(api, jwtToken) {
    return await this.makeSecureRequest(
      "https://apiconnect.angelone.in/rest/secure/angelbroking/order/v1/getOrderBook",
      "GET",
      api,
      jwtToken,
    );
  }

  async getLTP(exchangeTokens, api, jwtToken) {
    return await this.makeSecureRequest(
      "https://apiconnect.angelone.in/rest/secure/angelbroking/market/v1/quote/",
      "POST",
      api,
      jwtToken,
      {
        mode: "FULL",
        exchangeTokens: exchangeTokens,
      },
    ).then((response) => response.data.fetched);
  }

  async searchScrip(exchange, searchscrip, jwtToken, api) {
    try {
      return await this.makeSecureRequest(
        "https://apiconnect.angelone.in/rest/secure/angelbroking/order/v1/searchScrip",
        "POST",
        api,
        jwtToken,
        {
          exchange,
          searchscrip,
        },
      );
    } catch (error) {
      console.error("Error while searching script:", error);
      throw error;
    }
  }

  async calculateMargin(positions, api, jwtToken) {
    return await this.makeSecureRequest(
      "https://apiconnect.angelone.in/rest/secure/angelbroking/margin/v1/batch",
      "POST",
      api,
      jwtToken,
      {
        positions,
      },
    ).then((response) => response);
  }
}

module.exports = SmarterApi;

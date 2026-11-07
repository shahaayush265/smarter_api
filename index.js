const { TOTP } = require("totp-generator");
const axios = require("axios");
const https = require("https");
const { HttpsProxyAgent } = require("https-proxy-agent");

const defaultHttpsAgent = new https.Agent({
  keepAlive: true,
  minVersion: "TLSv1.2",
  maxVersion: "TLSv1.3",
});

class SmarterApi {
  constructor(proxyConfig = null) {
    this.publicIp = "103.248.75.23"; // Sensible default fallback
    this.privateIp = "192.168.1.123"; // Initialize private IP
    this.macAddress = "fe80::0211:22ff:fe33:4455"; // Initialize MAC Address
    this.retryCount = 3;
    this.proxyConfig = null;
    this.httpsAgent = defaultHttpsAgent;

    if (proxyConfig) {
      this.setProxy(proxyConfig);
    } else {
      this.fetchDetails();
    }
  }

  setProxy(proxyConfig) {
    if (!proxyConfig) {
      this.proxyConfig = null;
      this.httpsAgent = defaultHttpsAgent;
      return;
    }

    const { static_ip, proxy_username, proxy_password, proxy_port } = proxyConfig;
    if (static_ip) {
      this.publicIp = static_ip;
      if (proxy_username && proxy_password && proxy_port) {
        const proxyUrl = `http://${encodeURIComponent(proxy_username)}:${encodeURIComponent(proxy_password)}@${static_ip}:${proxy_port}`;
        this.httpsAgent = new HttpsProxyAgent(proxyUrl, {
          keepAlive: true,
          minVersion: "TLSv1.2",
          maxVersion: "TLSv1.3",
        });
        this.proxyConfig = proxyConfig;
      }
    }
  }

  async fetchDetails() {
    try {
      const response = await axios.get("https://api.ipify.org?format=json", {
        httpsAgent: this.httpsAgent,
        timeout: 3000,
      });
      if (response?.data?.ip) {
        this.publicIp = response.data.ip;
      }
    } catch (error) {
      // Fallback silently without breaking caller
    }
  }

  async makeFetchRequest(url, method, api, jwtToken, body, clientName = null) {
    for (let i = 0; i <= this.retryCount; i++) {
      try {
        const headers = {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-UserType": "USER",
          "X-SourceID": "WEB",
          "X-ClientLocalIP": this.privateIp,
          "X-ClientPublicIP": this.publicIp || "103.248.75.23",
          "X-MACAddress": this.macAddress,
          "X-PrivateKey": api,
        };

        if (jwtToken) {
          headers["Authorization"] = `Bearer ${jwtToken}`;
        }

        const requestOptions = {
          method,
          url,
          headers,
          httpsAgent: this.httpsAgent,
          timeout: 10000,
        };

        if (method !== "GET" && method !== "HEAD" && body !== null && body !== undefined) {
          requestOptions.data = JSON.stringify(body);
        }

        const response = await axios.request(requestOptions);
        return response.data;
      } catch (error) {
        if (i >= this.retryCount) {
          throw error;
        }
        const delay = (i + 1) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  async createSession(api, username, mpin, totp_token, clientName = null) {
    const { otp: totp } = TOTP.generate(totp_token);

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
        clientName,
      );

      if (response && response.data && response.data.jwtToken) {
        return response.data.jwtToken;
      }

      const clientLabel = clientName ? `${clientName} (${username})` : username;
      const apiMsg = response?.message ? `: ${response.message}` : "";
      console.error(`[Login Failed] ${clientLabel} - Did not receive JWT token${apiMsg}`);
      throw new Error(`Did not receive JWT token for ${clientLabel}`);
    } catch (error) {
      const clientLabel = clientName ? `${clientName} (${username})` : username;
      if (!error.message.startsWith("Did not receive JWT token")) {
        console.error(`[Login Failed] ${clientLabel} - Did not receive JWT token (${error.message})`);
      }
      throw new Error(`Did not receive JWT token for ${clientLabel}`);
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
      const errMsg = error?.response?.data?.message || error.message;
      const endpoint = url.replace("https://apiconnect.angelone.in", "");
      console.error(`[API Error] ${method} ${endpoint}: ${errMsg}`);
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
    try {
      const res = await this.makeSecureRequest(
        "https://apiconnect.angelone.in/rest/secure/angelbroking/portfolio/v1/getAllHolding",
        "GET",
        api,
        jwtToken,
      );
      if (res?.data?.holdings && Array.isArray(res.data.holdings)) {
        return { ...res, data: res.data.holdings, totalholding: res.data.totalholding };
      }
      return res;
    } catch (error) {
      // Fallback to legacy getHolding endpoint if getAllHolding fails
      try {
        return await this.makeSecureRequest(
          "https://apiconnect.angelone.in/rest/secure/angelbroking/portfolio/v1/getHolding",
          "GET",
          api,
          jwtToken,
        );
      } catch (e) {
        throw error;
      }
    }
  }

  async getAllHoldings(api, jwtToken) {
    const res = await this.makeSecureRequest(
      "https://apiconnect.angelone.in/rest/secure/angelbroking/portfolio/v1/getAllHolding",
      "GET",
      api,
      jwtToken,
    );
    if (res?.data?.holdings && Array.isArray(res.data.holdings)) {
      return { ...res, data: res.data.holdings, totalholding: res.data.totalholding };
    }
    return res;
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

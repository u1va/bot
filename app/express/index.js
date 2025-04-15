module.exports = (client) => {
  const express = require("express");
  const app = express();

  app.use(express.json());

  app.post(`/checkboosts`, async (req, res) =>
    require("./checkboosts")(client, req, res)
  );
  
  app.get(`/doboosts`, async (req, res) =>
    require("./doboosts")(client, req, res)
  );
  
  app.get(`/domembers`, async (req, res) =>
    require("./domembers")(client, req, res)
  );

  const port = client.config.redirectURL.split(":")[2];
  app.listen(port, () => 
    console.log(`\x1b[31mあ -> \x1b[0m WEBSITE IS READY ON PORT ${port}. ✅`)
  );
};

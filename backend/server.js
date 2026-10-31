process.env.TZ = process.env.TZ || "Asia/Kolkata";

const app = require("./src/app");

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} (Timezone: ${process.env.TZ})`);
});

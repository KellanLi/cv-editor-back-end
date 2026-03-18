export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  url: process.env.DATABASE_URL,
});

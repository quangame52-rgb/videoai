import createServer from "../server";

let app;

export default async (req, res) => {
  if (!app) {
    app = await createServer();
  }
  return app(req, res);
};

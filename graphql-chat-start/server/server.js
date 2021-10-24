const fs = require("fs");
const { ApolloServer, gql } = require("apollo-server-express");
const cors = require("cors");
const express = require("express");
const expressJwt = require("express-jwt");
const jwt = require("jsonwebtoken");
const db = require("./db");

async function startApolloServer() {
  const port = 9000;
  const jwtSecret = Buffer.from("xkMBdsE+P6242Z2dPV3RD91BPbLIko7t", "base64");

  const app = express();
  app.use(
    cors(),
    express.json(),
    expressJwt({
      credentialsRequired: false,
      secret: jwtSecret,
      algorithms: ["HS256"],
    })
  );

  const typeDefs = gql(
    fs.readFileSync("./schema.graphql", { encoding: "utf8" })
  );
  const resolvers = require("./resolvers");

  function context({ req }) {
    if (req && req.user) {
      return { userId: req.user.sub };
    }
    return {};
  }

  const apolloServer = new ApolloServer({ typeDefs, resolvers, context });
  await apolloServer.start();
  apolloServer.applyMiddleware({ app, path: "/graphql" });

  app.post("/login", (req, res) => {
    const { name, password } = req.body;
    const user = db.users.get(name);
    if (!(user && user.password === password)) {
      res.sendStatus(401);
      return;
    }
    const token = jwt.sign({ sub: user.id }, jwtSecret);
    res.send({ token });
  });
  await new Promise((resolve) => app.listen({ port }, resolve));
  console.log(`Server started on port ${port}`);
  return { server: apolloServer, app };
}

startApolloServer();

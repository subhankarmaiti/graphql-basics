const fs = require("fs");
const http = require("http");
const { SubscriptionServer } = require("subscriptions-transport-ws");
const { makeExecutableSchema } = require("@graphql-tools/schema");
const { ApolloServer, gql } = require("apollo-server-express");
const { execute, subscribe } = require("graphql");
const cors = require("cors");
const express = require("express");
const expressJwt = require("express-jwt");
const jwt = require("jsonwebtoken");
const db = require("./db");

async function startApolloServer() {
  const port = 9000;
  const jwtSecret = Buffer.from("xkMBdsE+P6242Z2dPV3RD91BPbLIko7t", "base64");

  const app = express();
  const httpServer = http.createServer(app);
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
  const schema = makeExecutableSchema({ typeDefs, resolvers });

  const apolloServer = new ApolloServer({
    typeDefs,
    resolvers,
    context,
    plugins: [
      {
        async serverWillStart() {
          return {
            async drainServer() {
              subscriptionServer.close();
            },
          };
        },
      },
    ],
  });
  const subscriptionServer = SubscriptionServer.create(
    {
      schema,
      execute,
      subscribe,
    },
    {
      server: httpServer,
      path: apolloServer.graphqlPath,
    }
  );
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

  await new Promise((resolve) => httpServer.listen({ port }, resolve));
  console.log(`Server started on port ${port}`);
  return { server: apolloServer, app: httpServer };
}

startApolloServer();

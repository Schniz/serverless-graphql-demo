import { makeExecutableSchema } from "@graphql-tools/schema";

export const schema = () =>
  makeExecutableSchema({
    typeDefs: `
      type Query {
        hello: String
        users: [User]
        userById(id: ID!): User
      }

      type User {
        id: ID!
        name: String!
      }
    `,
    resolvers: {
      Query: {
        hello: () => "Hello world!",
        users: () => [{ id: "1", name: "Joe Secret" }],
        userById: (_, { id }) => ({ id, name: "Joe Secret" }),
      },
    },
  });

export const merge = {
  User: {
    fieldName: "userById",
    selectionSet: "{ id }",
    args: (o) => ({ id: o.id }),
  },
};

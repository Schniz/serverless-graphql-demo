import { makeExecutableSchema } from "@graphql-tools/schema";

export const schema = () =>
  makeExecutableSchema({
    typeDefs: `
      type Query {
        posts: [Post]
        postsByUserId(id: ID!): [Post]
        postsUserById(id: ID!): User
      }

      type User {
        id: ID!
        posts: [Post]
      }

      type Post {
        id: ID!
        title: String!
        author: User
      }
    `,
    resolvers: {
      Query: {
        posts: () => [{ id: "1", title: "Hello world!" }],
        postsUserById: (_, { id }) => ({ id }),
      },
      Post: {
        author: () => ({ id: "1" }),
      },
      User: {
        posts: (user) => {
          return [{ id: String(user.id), title: `Hello world!` }];
        },
      },
    },
  });

export const merge = {
  User: {
    fieldName: "postsUserById",
    selectionSet: "{ id }",
    args: (o) => {
      return { id: o.id, posts: o.posts };
    },
  },
};

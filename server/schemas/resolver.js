const { CardSet, Card, Profile } = require("../models");
const { signToken, AuthenticationError } = require("../utils/auth");

const resolvers = {
  Query: {
    profiles: async () => {
      return Profile.find();
    },

    profile: async (parent, { profileId }) => {
      return Profile.findOne({ _id: profileId });
    },
    // By adding context to our query, we can retrieve the logged in user without specifically searching for them
    me: async (parent, args, context) => {
      if (context.user) {
        return Profile.findOne({ _id: context.user._id });
      }
      throw AuthenticationError;
    },
    cardSets: async (parent, { id, amount }) => {
      const params = id ? { _id: id } : {};
      const cardSets = await CardSet.find(params).populate("cards");
      if (amount) {
        return cardSets.slice(0, amount);
      }
      return cardSets;
    },
    card: async (parent, { id }) => {
      const params = id ? { _id: id } : {};
      return Card.findOne(params);
    },
  },
  Mutation: {
    addProfile: async (parent, { username, email, password }) => {
      const profile = await Profile.create({ username, email, password });
      const token = signToken(profile);
      return { token, profile };
    },
    login: async (parent, { email, password }) => {
      const profile = await Profile.findOne({ email });
      if (!profile) {
        throw AuthenticationError;
      }
      const correctPw = await profile.isCorrectPassword(password);

      if (!correctPw) {
        throw AuthenticationError;
      }
      const token = signToken(profile);
      return { token, profile };
    },

    addCardSet: async (parent, { title, cardSet }) => {
      const newCardSet = await CardSet.create({ title });

      for (let i = 0; i < cardSet.length; i++) {
        const { term, description } = cardSet[i];
        const newCard = await Card.create({ term, description });

        await CardSet.findOneAndUpdate(
          { _id: newCardSet._id },
          { $push: { cards: newCard._id } },
          { new: true }
        );
      }

      return newCardSet;
    },
    updateCardSet: async (parent, { id, cardSet }) => {
      const updatedCardSet = await CardSet.findOneAndUpdate(
        { _id: id },
        { cardSet },
        { new: true }
      );
      return updatedCardSet;
    },
    deleteCardSet: async (parent, { id }) => {
      const deletedCardSet = await CardSet.findOneAndDelete({ _id: id });
      return deletedCardSet;
    },
  },
};
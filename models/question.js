module.exports = (sequelize, DataTypes) => {
  const Question = sequelize.define("Question", {
    question: DataTypes.TEXT,
    answer: DataTypes.TEXT,
    confidence: DataTypes.FLOAT,
  });

  return Question;
};

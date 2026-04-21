const mlpModel          = require("./models/mlpModel");
const linearModel       = require("./models/linearModel");
const decisionTreeModel = require("./models/decisionTreeModel");
const randomForestModel = require("./models/randomForestModel");

// Registry: add new models here — nothing else needs changing.
const MODELS = {
  [mlpModel.name]:          mlpModel,
  [linearModel.name]:       linearModel,
  [decisionTreeModel.name]: decisionTreeModel,
  [randomForestModel.name]: randomForestModel,
};

const DEFAULT_MODEL = mlpModel.name;

async function forecast(rows, hoursAhead = 24, modelName = DEFAULT_MODEL, fromDate = new Date()) {
  const model = MODELS[modelName] ?? MODELS[DEFAULT_MODEL];

  const base = {
    model_name: model.name,
    model_label: model.label,
    model_description: model.description,
    trained_on: rows.length,
  };

  if (rows.length < 10) {
    return { ...base, insufficient_data: true, predictions: [] };
  }

  const predictions = await model.predict(rows, hoursAhead, fromDate);
  return { ...base, insufficient_data: false, predictions };
}

module.exports = {
  forecast,
  AVAILABLE_MODELS: Object.values(MODELS).map(({ name, label, description }) => ({
    name,
    label,
    description,
  })),
};

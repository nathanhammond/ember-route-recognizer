export default function getParam(params, key) {
  if (typeof params !== "object" || params === null) {
    throw new Error("You must pass an object as the second argument to `generate`.");
  }
  if (!params.hasOwnProperty(key)) {
    throw new Error("You must provide param `" + key + "` to `generate`.");
  }
  if (("" + params[key]).length === 0) {
    throw new Error("You must provide a param `" + key + "`.");
  }

  return params[key];
}

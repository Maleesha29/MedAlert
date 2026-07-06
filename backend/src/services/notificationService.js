export const notifyUser = async (type, payload) => {
  console.log(`[notification:${type}]`, payload);
  return { ok: true, type, payload };
};

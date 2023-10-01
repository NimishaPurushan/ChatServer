const redis = require('redis');

const SESSION_TTL = 24 * 60 * 60;

class RedisStore {
  constructor(redisConfig) {
    this.redisClient = redis.createClient(redisConfig);
    this.redisClient.on('error', err => console.log('Redis Client Error', err));
    this.connect();
  }

  async connect() {
    await this.redisClient.connect();
    console.log("Connected to Redis");
  }

  async saveUserInfo(username, userId, sessionId) {
    console.log("Saving user info ", username, userId, sessionId);
    try {
      await this.redisClient.multi().hSet(
        `session:${username}`, "userId", userId, 
        "sessionId", sessionId).expire(`session:${username}`, SESSION_TTL).exec();
      console.log("Saved user info");
    } catch (error) {
      console.error("Error saving user info:", error);
      throw error;
    }
  }

  async getUserInfo(username) {
    return await this.redisClient.hmGet(
        `session:${username}`, "userId");
  }

  async deleteUserInfo(username) {
    try {
      await this.redisClient.del(`session:${username}`);
      console.log("Deleted user info for username:", username);
    } catch (error) {
      console.error("Error deleting user info:", error);
      throw error;
    }
  }
}

module.exports = {RedisStore};

// const redisConfig = {
//   url: `rediss://${process.env.AZURE_CACHE_FOR_REDIS_HOST_NAME}:6380`,
//   password: process.env.AZURE_CACHE_FOR_REDIS_ACCESS_KEY,
// }

// const sessionStore= new RedisStore(redisConfig)
// sessionStore.saveUserInfo("nimi", "122", "122")
// const session_id = sessionStore.getUserInfo("nimi")
// console.log("redissession", session_id);
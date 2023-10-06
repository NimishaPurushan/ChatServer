const { CosmosClient } = require("@azure/cosmos");

class userDB {
  constructor(cosmosConfig) {
    this.client = new CosmosClient(cosmosConfig);
    this.database= this.client.database("SessionDB")
    this.container = this.database.container("Sessions");
    console.log("Cosmos DB Container created", this.container);
  }

  async findSession(id) {
    try {
      const querySpec = {
        query: "SELECT * FROM c WHERE c.id = @id",
        parameters: [{ name: "@id", value: id }],
      };
  
      const { resources: results } = await this.container.items.query(querySpec).fetchAll();
  
      if (results.length > 0) {
        console.log("Success, Sessions", results[0]);
      } else {
        console.log("Session not found");
      }
    } catch (err) {
      console.error("Error", err);
    }
  }

  async saveUser(userID, username, hashedPassword) {
    // Create an object representing the session data
    const userData = {
      id: userID,
      username: username,
      password: hashedPassword,
      connected : false
    };
  
    try {
        const { resource: createdItem } = await this.container.items.create(userData);
        console.log("User Created:", createdItem);
    } catch (err) {
      console.error("Error", err);
    }
  }

  async updateUser(userID, connected) {
    const { resource: userData } = await this.container.item(userID, userID).read();

    // Update the connected status in the existing user document
    userData.connected = connected;
  
    try {
        const { resource: updatedItem } = await this.container.item(userID, userID).replace(userData);
        console.log("User Updated:", updatedItem);
    } catch (err) {
      console.error("Error", err);
    }
  }
  

  async findAllSessions(callback) {
    try {
      const { resources: sessions } = await this.container.items.readAll().fetchAll();
      callback(null, sessions);
    } catch (err) {
      console.error("Error", err);
      callback(err, null);
    }
  }
  
  async queryByUsername(username) {
    try {
      const querySpec = {
        query: "SELECT * FROM c WHERE c.username = @username",
        parameters: [{ name: "@username", value: username }],
      };
  
      const { resources: results } = await this.container.items.query(querySpec).fetchAll();
      console.log("Success Found user", results);
      if (results) return results[0]
      else return null;
    } catch (err) {
      console.error("Error", err);
      throw err;
    }
  }

  async deleteSession(id) {
    try {
      const { resource: deletedItem } = await this.container.item(id, id).delete();
      console.log("Success Deleted Item", deletedItem);
    } catch (err) {
      console.error("Error", err);
    }
  }
  
}

module.exports = {
  userDB 
};
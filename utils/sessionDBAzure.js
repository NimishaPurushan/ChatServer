const { CosmosClient } = require("@azure/cosmos");

class SessionDB {
  constructor(cosmosConfig) {
    this.client = new CosmosClient(cosmosConfig);
    console.log("Cosmos DB Client created", this.client);
    this.database= this.client.database("SessionDB")
    console.log("Cosmos DB Database created", this.database);
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
        console.log("Success", results[0]);
      } else {
        console.log("Session not found");
      }
    } catch (err) {
      console.error("Error", err);
    }
  }

  async saveSession(id, session, username) {
    // Create an object representing the session data
    const sessionData = {
      id: id,
      session_id: session,
      username: username,
    };
  
    try {
      // Check if the session already exists
      const { resource: existingItem } = await this.container.item(username).read();
  
      if (existingItem) {
        // If the session exists, replace it with the new session data
        const { resource: replacedItem } = await this.container.item(username).replace(sessionData);
        console.log("Session Updated:", replacedItem);
      } else {
        // If the session does not exist, create a new session
        const { resource: createdItem } = await this.container.items.create(sessionData);
        console.log("Session Created:", createdItem);
      }
    } catch (err) {
      console.error("Error", err);
    }
  }
  

  async findAllSessions(callback) {
    try {
      const { resources: sessions } = await this.container.items.readAll().fetchAll();
      console.log("Success", sessions);
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
      console.log("Success", results);
      return results;
    } catch (err) {
      console.error("Error", err);
      throw err;
    }
  }

  async deleteSession(id) {
    try {
      const { resource: deletedItem } = await this.container.item(id, id).delete();
      console.log("Success", deletedItem);
    } catch (err) {
      console.error("Error", err);
    }
  }
  
}

module.exports = {
  SessionDB 
};
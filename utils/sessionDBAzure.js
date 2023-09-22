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
        console.log("Success, Sessions", results[0]);
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
      const sessions = await this.queryByUsername(username);
      if (sessions.length === 0) {
        const { resource: createdItem } = await this.container.items.create(sessionData);
        console.log("Session Created:", createdItem);
      } else {   
        for(const existingItem of sessions){
          console.log("SESSION found:", existingItem);
          const { resource: replacedItem } = await this.container.item(existingItem.id, existingItem.id).replace(sessionData);
          console.log("Session Updated:", replacedItem)
        }
        
      }
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
      return results;
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
  SessionDB 
};
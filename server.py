from flask import Flask, request

app = Flask(__name__)

@app.route('/')
def hello_world():
    return 'Hello, World!'

@app.route('/greet')
def greet_user():
    name = request.args.get('name', 'User')  # Get the 'name' parameter from the query string
    return f'Hello, {name}!'

if __name__ == '__main__':
    app.run(debug=True)
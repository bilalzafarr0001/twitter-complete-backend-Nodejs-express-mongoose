const http = require("http");
const app = require("./app");
const server = http.createServer(app);

const port = 3000;
app._router.stack.forEach(function(r){
  if (r.route && r.route.path){
    console.log(r.route.path)
  }
})
// server listening
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

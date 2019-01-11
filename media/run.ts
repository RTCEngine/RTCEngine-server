import Server from './server'


const server = new Server()
const port = 6000
server.start(port, '0.0.0.0', () => {
    console.log('start on', port)
})

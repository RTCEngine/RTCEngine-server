import * as os from 'os'

const { Etcd3 } = require('etcd3')

import config from './config'

const client = new Etcd3({hosts:config.etcd.hosts})


const registerService = async () => {

    const lease = client.lease(1)

    const serviceName = os.hostname() + 'media' + process.pid

    const data = {
        name: serviceName,
        config: config.server.externalUrl
    }

    await lease.put('/rtc/media/' + serviceName).value(JSON.stringify(data)).exec()

    lease.on('lost', (err) => {
        console.error(err)
    })

    lease.on('keepaliveFired', () => {
        console.log('keepaliveFired')
    })
    
}

export default {
    registerService
}
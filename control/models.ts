import 'reflect-metadata'


import {ConnectionOptions, createConnection,Connection,
    Entity, PrimaryGeneratedColumn, Column, BaseEntity,
    CreateDateColumn,UpdateDateColumn,JoinColumn,ManyToOne,
    OneToOne,OneToMany,AfterUpdate,AfterInsert,MoreThan} from 'typeorm'



import config from './config'


@Entity({
    name:'stream'
})
class Stream extends BaseEntity {

    @PrimaryGeneratedColumn()
    id: number 

    @Column({
        length:50
    })
    room:string

    @Column({
        length:50
    })
    user:string


    @Column({
        length:40,
        nullable:false
    })
    streamId:string


    @Column({
        length:40,
        nullable:true
    })
    subscriberId:string


    @Column({
        default:false
    })
    origin:boolean


    @Column({
        length:50,
        nullable:true
    })
    node:string

    @Column('text', {
        nullable:true
    })
    dataJson?:string


    @CreateDateColumn()
    create_date:Date


    public get data(): any {
        if (this.dataJson) return JSON.parse(this.dataJson);
        else return null;
    }

    public set data(data: any) {
        if (data) this.dataJson = JSON.stringify(data);
        else this.dataJson = null;
    }


    toJSON():any {
        return {
            id: this.id,
            room: this.room,
            user: this.user,
            streamId: this.streamId,
            subscriberId:this.subscriberId,
            origin: this.origin,
            node: this.node,
            data: this.data
        }
    }
}



const database = config.database as any
database.entities = [Stream]
database.synchronize =  true //!!process.env.SYNCHRONIZE 
let options = database as ConnectionOptions

createConnection(options).then((conn:Connection) => {
    console.log('database connected')
})


export {
    Stream
}

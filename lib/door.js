export default class Door {
  constructor(init) {
    Object.assign(this, init)
    this.type = 'door'
    //this.direction = null
    this.to = { }
  }
}

/**
 * Author: FreezePhoenix
 * Description: A quick-n-dirty queue. The queue is implemented as a singly linked list that keeps track of the head and tail of the list.
 * The property "next" is set on data that is passed into the queue, so users may want to pre-set this field to null on any objects they pass in.
 * Setting the field to null helps performance slightly, but is not truly necessary.
 * The queue's goal is to minimize memory usage while maintaining efficiency.
 */
export class Queue {
    head = null;
    tail = null;
    constructor() {}
    enqueue(data) {
        if(this.head == null) {
            this.head = this.tail = data;
        } else {
            this.tail.next = data;
            this.tail = data;
        }
    }
    dequeue() {
      if(this.head == null) {
          return null;
      }
      let temp = this.head;
      this.head = temp.next;
      return temp;
    }
    empty() {
      return this.head == null;
    }
}

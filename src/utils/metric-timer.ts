export class MetricTimer {
    initialTime: number
    title: string
    constructor(title: string) {
        this.initialTime = Date.now()
        this.title = title
    }
    getDiff(): number {
        return Date.now() - this.initialTime
    }
    reset(title: string) {
        this.initialTime = Date.now()
        this.title = title
    }
    getDiffInSeconds(): number {
        return this.getDiff() / 1000
    }
    getDiffInMinutes(): number {
        return this.getDiffInSeconds() / 60
    }
    getLabelSeconds(): string {
        return `${this.title} run in ${this.getDiffInSeconds()}s`
    }
    getLabelMinutes(): string {
        return `${this.title} run in ${this.getDiffInMinutes()}m`
    }
}
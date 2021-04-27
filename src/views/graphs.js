import { xf, exists, equals, secondsToHms, prn } from '../functions.js';
import { zwo } from '../workouts/parser.js';

function powerToZone(value, ftp = 256) {
    let name = 'one';
    let hex   = '#636468';
    if(value < (ftp * 0.55)) {
        name = 'one';
    } else if(value < (ftp * 0.76)) {
        name = 'two';
    } else if(value < (ftp * 0.88)) {
        name = 'three';
    } else if(value < (ftp * 0.95)) {
        name = 'four';
    } else if(value < (ftp * 1.06)) {
        name = 'five';
    } else if (value < (ftp * 1.20)) {
        name = 'six';
    } else {
        name = 'seven';
    }
    return {name: name};
}

function valueToHeight(max, value) {
    return 100 * (value/max);
}

class DataGraph extends HTMLElement {
    constructor() {
        super();
        this.value = 0;
        this.metricValue = 0;
        this.bars = 0;
    }
    connectedCallback() {
        this.prop = this.getAttribute('prop');
        this.metric = this.getAttribute('metric');
        this.scale = this.getAttribute('scale') || 400;

        this.width = this.getWidth();

        xf.sub(`db:${this.prop}`, this.onUpdate.bind(this));
        xf.sub(`db:${this.metric}`, this.onMetric.bind(this));
    }
    disconnectedCallback() {
        document.removeEventListener(`db:${this.prop}`, this.onUpdate);
        document.removeEventListener(`db:${this.metric}`, this.onMetric);
    }
    getWidth() {
        return this.getBoundingClientRect().width;
    }
    onUpdate(value) {
        this.value = value;
        this.render();
    }
    onMetric(value) {
        this.metricValue = value;
    }
    bar(zone, height, width) {
        return `<div class="graph-bar zone-${zone}" style="height: ${height}%; width: ${width}px;"></div>`;
    }
    shift() {
        this.removeChild(this.childNodes[0]);
    }
    render() {
        const zone = powerToZone(this.value, this.metricValue).name;
        const barHeight = valueToHeight(this.scale, this.value);
        if(this.bars >= this.width) {
            this.shift();
        }
        this.insertAdjacentHTML('beforeend', this.bar(zone, barHeight, 1));
        this.bars += 1;
    }
}

customElements.define('data-graph', DataGraph);


// Workout Graph
function intervalsToGraph(intervals, ftp) {
    let scale = ftp * 1.6;
    return intervals.reduce( (acc, interval) => {
        let width = (interval.duration) < 1 ? 1 : parseInt(Math.round(interval.duration)); // ?
        let stepsCount = interval.steps.length;
        return acc + interval.steps.reduce((a, step) => {
            const power = parseInt(ftp * step.power);
            const width = 100 / stepsCount;
            const height = valueToHeight(scale, (power === 0) ? 80 : power);
            const zone = (powerToZone(power, ftp)).name;
            const infoPower = power === 0 ? 'Free ride' : power;
            const infoPowerUnit = power === 0 ? '' : 'W';
            const infoTime = secondsToHms(step.duration, true);

            return a +
                `<div class="graph--bar zone-${zone}" style="height: ${height}%; width: ${width}%">
                     <div class="graph--info t5">
                         <div class="graph--info--power">${infoPower}${infoPowerUnit}</div>
                         <div class="graph--info--time">${infoTime}<span></span></div>
                     </div>
                </div>`;
        }, `<div class="graph--bar-group" style="width: ${width}px">`) + `</div>`;

    }, ``);
}

class WorkoutGraph extends HTMLElement {
    constructor() {
        super();
        this.workout = {};
        this.metricValue = 0;
        this.dom = {};
        this.index = 4;
    }
    connectedCallback() {
        this.prop = this.getAttribute('prop');
        this.metric = this.getAttribute('metric');
        this.width = this.getWidth();

        xf.sub(`db:${this.prop}`, this.onUpdate.bind(this));
        xf.sub(`db:${this.metric}`, this.onMetric.bind(this));
    }
    disconnectedCallback() {
        document.removeEventListener(`db:${this.prop}`, this.onUpdate);
        document.removeEventListener(`db:${this.metric}`, this.onMetric);
    }
    getWidth() {
        return this.getBoundingClientRect().width;
    }
    onMetric(value) {
        this.metricValue = value;
        this.render();
    }
    onUpdate(value) {
        this.workout = value;
        this.dom.progress  = this.querySelector('#progress');
        this.dom.active    = this.querySelector('#progress-active');
        this.dom.intervals = this.querySelectorAll('.graph--bar-group');
        this.dom.steps     = this.querySelectorAll('.graph--bar');
        this.render();
    }
    progress() {
        const rect = this.dom.intervals[this.index].getBoundingClientRect();
        this.dom.active.style.left  = `${rect.left}px`;
        this.dom.active.style.width = `${rect.width}px`;
    }
    render() {
        const progress = `<div id="progress" class="progress"></div><div id="progress-active"></div>`;
        this.innerHTML = progress + intervalsToGraph(this.workout.intervals, this.metricValue);
    }
}

customElements.define('workout-graph', WorkoutGraph);

export { DataGraph, WorkoutGraph };

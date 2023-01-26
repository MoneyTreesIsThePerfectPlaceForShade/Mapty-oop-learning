"use strict";

// prettier-ignore

const form = document.querySelector(".form");
const containerWorkouts = document.querySelector(".workouts");
const inputType = document.querySelector(".form__input--type");
const inputDistance = document.querySelector(".form__input--distance");
const inputDuration = document.querySelector(".form__input--duration");
const inputCadence = document.querySelector(".form__input--cadence");
const inputElevation = document.querySelector(".form__input--elevation");

// строим архитектуру в ООП стиле

/////////////////////////////////////////////////////////////////////////////
// класс для тренировок, у нас будут два child класса: для бега и для велика
/////////////////////////////////////////////////////////////////////////////
class Workout {
  date = new Date();
  // в реальном мире лучше использовать библу для создания ID, но в этом проекте ограничимся
  // таким методом
  id = (Date.now() + "").slice(-10);
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords; // [lat, lng]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

/////////////
// класс бега
/////////////
class Running extends Workout {
  type = "running";
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();

    this._setDescription();
  }

  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

////////////////
// класс велика
////////////////
class Cycling extends Workout {
  type = "cycling";
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();

    this._setDescription();
  }

  calcSpeed() {
    // km/h                  // делим на 60, т.к. данные заводим в минутах
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

// const run1 = new Running([39, -12], 5.2, 24, 178);
// const cycle1 = new Cycling([39, -12], 27, 95, 523);

//////////////////////////////////////////////////////
// класс самого приложения // архитектура приложения
//////////////////////////////////////////////////////
class App {
  // приватные поля
  #map;
  #mapZoom = 13;
  #mapEvent;
  #workouts = [];

  constructor() {
    // прогружаем карту
    this._getPosition();

    // get data from local storage
    this._getLocalStorage();

    // отображаем форму ввода
    // снова биндим, потому что this в eventHandler показывает на HTML элемент,
    // то есть на форму в данном случае, чтобы указывал на объект, нужно биндить
    form.addEventListener("submit", this._newWorkout.bind(this));

    inputType.addEventListener("change", this._toggleElevationField);

    containerWorkouts.addEventListener("click", this._moveToPopup.bind(this));
  }

  // метод, позволяющий получить координаты и отрендерить карту
  _getPosition() {
    // использую geolocation api
    if (navigator.geolocation) {
      // принимает два колбэка - на success и на error
      navigator.geolocation.getCurrentPosition(
        // когда мы подаем ф-ию без вызова, но нам нужен this, то биндим его сами
        this._loadMap.bind(this),
        function () {
          alert("Could not get your position");
        }
      );
    }
  }

  // рендер карты
  _loadMap(position) {
    // деструктуризация объекта для получения координат
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    // console.log(`https://www.google.com/maps/@${latitude},${longitude}`);
    // создаем массив координат для leaflet lib
    const coords = [latitude, longitude];
    // рендер карты
    this.#map = L.map("map").setView(coords, this.#mapZoom);

    L.tileLayer("https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // event listener в leaflet lib
    this.#map.on("click", this._showForm.bind(this));

    this.#workouts.forEach((work) => this._renderWorkoutMarker(work));
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove("hidden");
    inputDistance.focus();
  }

  _hideForm() {
    // чистим инпуты
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        "";

    form.style.display = "none";
    // скрывает форму
    form.classList.add("hidden");

    setTimeout(() => (form.style.display = "grid"), 1000);
  }

  _toggleElevationField() {
    inputElevation.closest(".form__row").classList.toggle("form__row--hidden");
    inputCadence.closest(".form__row").classList.toggle("form__row--hidden");
  }

  _newWorkout(e) {
    // в аргументах '...inputs', что означает массив инпутов, любой длины
    // .every - если код true для всех, то возвращает true
    const validInputs = (...inputs) =>
      inputs.every((inp) => Number.isFinite(inp));

    const allPositive = (...inputs) => inputs.every((inp) => inp > 0);

    e.preventDefault();

    // Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;
    // If workout running, create running object
    if (type === "running") {
      // Check if data is valid
      const cadence = +inputCadence.value;
      if (
        // !Number.isFinite(distance) ||
        // !Number.isFinite(duration) ||
        // !Number.isFinite(cadence)
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert("Inputs have to be positive numbers!");

      workout = new Running([lat, lng], distance, duration, cadence);
    }
    // If workout cycling, create cycle object
    if (type === "cycling") {
      // Check if data is valid
      const elevation = +inputElevation.value;
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert("Inputs have to be positive numbers!");

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }
    // Add new object to workout array
    this.#workouts.push(workout);

    // Render workout on map as marker
    this._renderWorkoutMarker(workout);
    // Render workout on list
    this._renderWorkout(workout);
    // Hide form + чистим инпуты
    this._hideForm();

    // Set local storage to all workouts
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === "running" ? "🏃‍♂️" : "🚴‍♀️"} ${workout.description}`
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `<li class="workout workout--${workout.type}" data-id="${
      workout.id
    }">
    <h2 class="workout__title">${workout.description}</h2>
    <div class="workout__details">
      <span class="workout__icon">${
        workout.type === "running" ? "🏃‍♂️" : "🚴‍♀️"
      }</span>
      <span class="workout__value">${workout.distance}</span>
      <span class="workout__unit">km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⏱</span>
      <span class="workout__value">${workout.duration}</span>
      <span class="workout__unit">min</span>
    </div>`;

    if (workout.type === "running") {
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.pace.toFixed(1)}</span>
          <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">🦶🏼</span>
          <span class="workout__value">${workout.cadence}</span>
          <span class="workout__unit">spm</span>
        </div>
      </li>
      `;
    }

    if (workout.type === "cycling") {
      html += `
      <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>
        </li>
      `;
    }

    form.insertAdjacentHTML("afterend", html);
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest(".workout");

    if (!workoutEl) return;

    const workout = this.#workouts.find(
      (work) => work.id === workoutEl.dataset.id
    );

    this.#map.setView(workout.coords, this.#mapZoom, {
      animate: true,
      pan: {
        duration: 1,
      },
    });

    // using the public interface
    // workout.click();

    // using local storage API
  }

  _setLocalStorage() {
    // key-value store
    localStorage.setItem("workouts", JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem("workouts"));

    // если нет никакой даты - то ничего не делаем
    if (!data) return;

    this.#workouts = data;

    this.#workouts.forEach((work) => this._renderWorkout(work));
  }

  reset() {
    localStorage.removeItem("workouts");
    location.reload();
  }
}

const app = new App();

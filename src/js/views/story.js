import { DEFAULT_MAP_VIEW, DEFAULT_MAP_ZOOM } from "../config.js";

export class StoryView {
  constructor() {
    this.storyForm = document.getElementById("story-form");
    this.storiesContainer = document.getElementById("stories-container");
    this.loadingElement = document.getElementById("loading");
    this.mapElement = document.getElementById("map");
    this.storyMapElement = document.getElementById("story-map");
    this.locationInput = document.getElementById("location-input");
    this.capturedImage = document.getElementById("captured-image");
    this.canvas = document.getElementById("canvas");
    this.video = document.getElementById("video");
    this.startCameraBtn = document.getElementById("start-camera");
    this.capturePhotoBtn = document.getElementById("capture-photo");
    this.stopCameraBtn = document.getElementById("stop-camera");
    this.submitBtn = document.getElementById("submit-btn");

    this.selectedLocation = null;
    this.stream = null;
  }

  cleanupCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    if (this.video) {
      this.video.srcObject = null;
      this.video.style.display = "none";
    }

    if (this.canvas) {
      this.canvas.style.display = "none";
    }

    if (this.startCameraBtn) this.startCameraBtn.disabled = false;
    if (this.capturePhotoBtn) this.capturePhotoBtn.disabled = true;
    if (this.stopCameraBtn) this.stopCameraBtn.disabled = true;
  }

  bindAddStory(handler) {
    if (!this.storyForm) return;

    this.storyForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      e.stopPropagation();

      const formData = new FormData(this.storyForm);
      const description = formData.get("description");
      const photo = this.capturedImage.src
        ? await this.dataURLtoFile(this.capturedImage.src, "story-photo.png")
        : null;

      if (!description) {
        this.showError("Deskripsi cerita wajib diisi!");
        return;
      }

      if (!photo) {
        this.showError("Foto cerita wajib diambil!");
        return;
      }

      if (!this.selectedLocation) {
        this.showError("Lokasi wajib dipilih!");
        return;
      }

      const originalText = this.submitBtn.textContent;
      this.submitBtn.disabled = true;
      this.submitBtn.textContent = "Mengunggah...";

      try {
        await handler(
          description,
          photo,
          this.selectedLocation.lat,
          this.selectedLocation.lng
        );
        this.storyForm.reset();
        this.capturedImage.style.display = "none";
        this.selectedLocation = null;
        this.locationInput.value = "";
        this.cleanupCamera();
      } catch (error) {
        this.showError(error.message);
      } finally {
        this.submitBtn.disabled = false;
        this.submitBtn.textContent = originalText;
      }
    });
  }

  bindCameraControls() {
    if (!this.startCameraBtn) return;

    this.startCameraBtn.addEventListener("click", () => this.startCamera());
    this.capturePhotoBtn.addEventListener("click", () => this.capturePhoto());
    this.stopCameraBtn.addEventListener("click", () => this.stopCamera());
  }

  async startCamera() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
      this.video.srcObject = this.stream;
      this.video.style.display = "block";
      this.canvas.style.display = "none";
      this.capturedImage.style.display = "none";

      this.startCameraBtn.disabled = true;
      this.capturePhotoBtn.disabled = false;
      this.stopCameraBtn.disabled = false;
    } catch (err) {
      console.error("Error accessing camera:", err);
      this.showError("Tidak dapat mengakses kamera: " + err.message);
    }
  }

  capturePhoto() {
    this.canvas.width = this.video.videoWidth;
    this.canvas.height = this.video.videoHeight;
    this.canvas.getContext("2d").drawImage(this.video, 0, 0);

    this.capturedImage.src = this.canvas.toDataURL("image/png");
    this.capturedImage.style.display = "block";
    this.video.style.display = "none";
    this.canvas.style.display = "none";
  }

  stopCamera() {
    this.cleanupCamera();
  }

  initializeStoryMap() {
    if (!this.storyMapElement || this.storyMap) return;

    this.storyMap = L.map(this.storyMapElement).setView(
      DEFAULT_MAP_VIEW,
      DEFAULT_MAP_ZOOM
    );
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.storyMap);

    this.storyMap.on("click", (e) => {
      this.selectedLocation = e.latlng;
      this.locationInput.value = `${e.latlng.lat.toFixed(
        4
      )}, ${e.latlng.lng.toFixed(4)}`;

      if (this.storyMarker) {
        this.storyMap.removeLayer(this.storyMarker);
      }

      this.storyMarker = L.marker([e.latlng.lat, e.latlng.lng])
        .addTo(this.storyMap)
        .bindPopup("Lokasi cerita Anda")
        .openPopup();
    });
  }

  dataURLtoFile(dataurl, filename) {
    const arr = dataurl.split(",");
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);

    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }

    return new File([u8arr], filename, { type: mime });
  }

  showLoading() {
    this.loadingElement.style.display = "block";
    this.storiesContainer.style.display = "none";
  }

  hideLoading() {
    this.loadingElement.style.display = "none";
    this.storiesContainer.style.display = "grid";
  }

  displayStories(stories) {
    this.storiesContainer.innerHTML = "";

    stories.forEach((story) => {
      const storyElement = document.createElement("div");
      storyElement.className = "story-card";
      storyElement.innerHTML = `
            <div class="story-image-container">
                <img src="${story.photoUrl}" alt="${
        story.description
      }" loading="lazy">
            </div>
            <div class="story-content">
                <h3>${story.name}</h3>
                <p>${story.description}</p>
                ${
                  story.lat && story.lon
                    ? `<small class="story-location">Lokasi: ${story.lat.toFixed(
                        4
                      )}, ${story.lon.toFixed(4)}</small>`
                    : ""
                }
            </div>
        `;
      this.storiesContainer.appendChild(storyElement);
    });
  }

  displayOfflineStories(stories) {
    if (!this.storiesContainer) return;

    const offlineIndicator = document.createElement("div");
    offlineIndicator.className = "offline-indicator";
    offlineIndicator.innerHTML = `
      <h2>📱 Stories Offline</h2>
      <p>Menampilkan cerita yang tersimpan di perangkat</p>
    `;
    offlineIndicator.style.cssText = `
      background: #fff3cd;
      color: #856404;
      padding: 1rem;
      border-radius: 8px;
      margin-bottom: 1rem;
      text-align: center;
    `;

    this.storiesContainer.innerHTML = "";
    this.storiesContainer.appendChild(offlineIndicator);

    stories.forEach((story) => {
      const storyElement = document.createElement("div");
      storyElement.className = "story-card offline-story";
      storyElement.innerHTML = `
        <div class="story-content">
          <h3>${story.name || "Anonymous"}</h3>
          <p>${story.description}</p>
          <small>Tersimpan offline: ${new Date(story.timestamp).toLocaleString(
            "id-ID"
          )}</small>
          <button class="delete-btn" data-id="${story.id}" style="
            background: #dc3545;
            color: white;
            border: none;
            padding: 0.5rem 1rem;
            border-radius: 5px;
            margin-top: 0.5rem;
            cursor: pointer;
          ">Hapus</button>
        </div>
      `;
      this.storiesContainer.appendChild(storyElement);
    });

    this.bindDeleteButtons();
  }

  bindDeleteButtons() {
    const deleteButtons = document.querySelectorAll(".delete-btn");
    deleteButtons.forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const storyId = parseInt(e.target.dataset.id);
        if (confirm("Hapus cerita ini?")) {
          try {
            await window.app.deleteStory(storyId);
            e.target.closest(".story-card").remove();
            this.showSuccess("Cerita berhasil dihapus!");
          } catch (error) {
            this.showError("Gagal menghapus cerita: " + error.message);
          }
        }
      });
    });
  }

  initializeMap() {
    if (!this.mapElement || this.map) return;

    this.map = L.map(this.mapElement).setView(
      DEFAULT_MAP_VIEW,
      DEFAULT_MAP_ZOOM
    );
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.map);
  }

  updateMap(stories) {
    if (!this.map) return;

    if (this.markers) {
      this.markers.forEach((marker) => this.map.removeLayer(marker));
    }

    this.markers = [];

    stories
      .filter((story) => story.lat && story.lon)
      .forEach((story) => {
        const marker = L.marker([story.lat, story.lon])
          .addTo(this.map)
          .bindPopup(story.description);
        this.markers.push(marker);
      });

    if (this.markers.length > 0) {
      const group = new L.featureGroup(this.markers);
      this.map.fitBounds(group.getBounds().pad(0.1));
    }
  }

  showError(message) {
    this.clearMessages();

    const errorDiv = document.createElement("div");
    errorDiv.className = "error";
    errorDiv.textContent = message;
    errorDiv.style.cssText = `
      background: #fee;
      color: #c33;
      padding: 1rem;
      border-radius: 8px;
      margin-bottom: 1rem;
      border: 1px solid #fcc;
    `;

    const activePage = document.querySelector(".page.active");
    if (activePage) {
      activePage.insertBefore(errorDiv, activePage.firstChild);
    }

    setTimeout(() => errorDiv.remove(), 5000);
  }

  showSuccess(message) {
    this.clearMessages();

    const successDiv = document.createElement("div");
    successDiv.className = "success";
    successDiv.textContent = message;
    successDiv.style.cssText = `
      background: #efe;
      color: #363;
      padding: 1rem;
      border-radius: 8px;
      margin-bottom: 1rem;
      border: 1px solid #cfc;
    `;

    const activePage = document.querySelector(".page.active");
    if (activePage) {
      activePage.insertBefore(successDiv, activePage.firstChild);
    }

    setTimeout(() => successDiv.remove(), 5000);
  }

  clearMessages() {
    const existingError = document.querySelector(".error");
    const existingSuccess = document.querySelector(".success");
    if (existingError) existingError.remove();
    if (existingSuccess) successDiv.remove();
  }
}

import { API_BASE_URL } from "../config.js";

export class StoryModel {
  constructor(authModel) {
    this.authModel = authModel;
  }

  async fetchStories() {
    const response = await fetch(`${API_BASE_URL}/stories?size=20&location=1`, {
      headers: {
        Authorization: `Bearer ${this.authModel.token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to fetch stories");
    }

    return data.listStory;
  }

  async addStory(description, photo, lat, lon) {
    const formData = new FormData();
    formData.append("description", description);
    formData.append("photo", photo);

    if (lat && lon) {
      formData.append("lat", lat);
      formData.append("lon", lon);
    }

    const response = await fetch(`${API_BASE_URL}/stories`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.authModel.token}`,
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to add story");
    }

    return data;
  }
}

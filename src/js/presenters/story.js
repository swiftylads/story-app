export class StoryPresenter {
  constructor(storyModel, storyView, router) {
    this.model = storyModel;
    this.view = storyView;
    this.router = router;

    this.view.bindAddStory(this.handleAddStory.bind(this));
    this.view.bindCameraControls();
  }

  async loadStories() {
    try {
      this.view.showLoading();
      const stories = await this.model.fetchStories();
      this.view.displayStories(stories);
      this.view.initializeMap();
      this.view.updateMap(stories);

      if (window.app) {
        await window.app.saveApiStoriesToIndexedDB(stories);
      }
    } catch (error) {
      this.view.showError("Gagal memuat cerita: " + error.message);

      if (window.app) {
        const offlineStories = await window.app.getAllStories();
        if (offlineStories.length > 0) {
          this.view.displayOfflineStories(offlineStories);
        }
      }
    } finally {
      this.view.hideLoading();
    }
  }

  async handleAddStory(description, photo, lat, lon) {
    try {
      await this.model.addStory(description, photo, lat, lon);
      this.view.showSuccess("Cerita berhasil ditambahkan!");
      setTimeout(() => this.router.navigateTo("home"), 2000);
    } catch (error) {
      this.view.showError("Gagal menambahkan cerita: " + error.message);
    }
  }
}

var availableFeatures = {
  navigation: {
    lists: [
      {
        availableListViews: ["list"],
        items: [
          {
            service: "googleplaymusic",
            type: "googleplaymusic-category",
            title: "My Playlists",
            artist: "",
            album: "",
            icon: "fa fa-folder-open-o",
            uri: "googleplaymusic/playlists"
          },
          {
            service: "googleplaymusic",
            type: "googleplaymusic-category",
            title: "Stations",
            artist: "",
            album: "",
            icon: "fa fa-folder-open-o",
            uri: "googleplaymusic/stations"
          },
        ]
      }
    ],
    prev: {
      uri: "googleplaymusic"
    }
  }
};

module.exports = {
  availableFeatures: availableFeatures,
};

let availableFeatures = {
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
          {
            service: "googleplaymusic",
            type: "googleplaymusic-category",
            title: "Featured Playlists",
            artist: "",
            album: "",
            icon: "fa fa-folder-open-o",
            uri: "googleplaymusic/featuredplaylists"
          },
          {
            service: "googleplaymusic",
            type: "googleplaymusic-category",
            title: "What's New",
            artist: "",
            album: "",
            icon: "fa fa-folder-open-o",
            uri: "googleplaymusic/new"
          },
          {
            service: "googleplaymusic",
            type: "googleplaymusic-category",
            title: "Genres & Moods",
            artist: "",
            album: "",
            icon: "fa fa-folder-open-o",
            uri: "googleplaymusic/categories"
          }
        ]
      }
    ],
    prev: {
      uri: "googleplaymusic"
    }
  }
}

module.exports = {
  availableFeatures,
}

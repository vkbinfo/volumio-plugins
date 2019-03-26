

module.exports = {
  availableFeatures: {
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
  },

  playMusicBrowseWindowOptions: {
    name: "Google Play Music",
    uri: "googleplaymusic",
    plugin_type: "music_service",
    plugin_name: "googleplaymusic",
    albumart: '/albumart?sourceicon=music_service/googleplaymusic/playMusic.svg'
  },

  volumioExpectedObjectStructure: {
    navigation: {
      prev: {
        uri: ''
      },
      "lists": [
        {
          "availableListViews": ["list"],
          "items": []
        }
      ]
    }
  }
};

function findCollectionSafe(app, nameOrId) {
  try {
    return app.findCollectionByNameOrId(nameOrId)
  } catch {
    return null
  }
}

function hasField(collection, name) {
  try {
    return !!collection.fields.getByName(name)
  } catch {
    return false
  }
}

migrate(
  (app) => {
    const settings = findCollectionSafe(app, 'app_settings')
    if (!settings) return true

    const hadOldBool = hasField(settings, 'season_over')
    const hadOldMsg = hasField(settings, 'season_over_message')

    if (!hasField(settings, 'rsvp_paused')) {
      settings.fields.add(
        new BoolField({
          id: 'bool_rsvp_paused',
          name: 'rsvp_paused',
          required: false,
          presentable: false,
          hidden: false,
          system: false,
        }),
      )
    }

    if (!hasField(settings, 'pause_message')) {
      settings.fields.add(
        new TextField({
          id: 'text_pause_msg',
          name: 'pause_message',
          required: false,
          presentable: false,
          hidden: false,
          system: false,
          min: 0,
          max: 500,
          pattern: '',
          autogeneratePattern: '',
        }),
      )
    }

    app.save(settings)

    const records = app.findRecordsByFilter('app_settings', '', '', 200, 0)
    for (const rec of records) {
      const oldBool = rec.get('season_over')
      const newBool = rec.get('rsvp_paused')
      const oldMsg = String(rec.get('season_over_message') || '').trim()
      const newMsg = String(rec.get('pause_message') || '').trim()

      if (hadOldBool && oldBool != null && !newBool) {
        rec.set('rsvp_paused', !!oldBool)
      }
      if (hadOldMsg && oldMsg && !newMsg) {
        rec.set('pause_message', oldMsg)
      }

      app.save(rec)
    }

    if (hadOldBool) settings.fields.removeByName('season_over')
    if (hadOldMsg) settings.fields.removeByName('season_over_message')

    return app.save(settings)
  },
  (app) => {
    const settings = findCollectionSafe(app, 'app_settings')
    if (!settings) return true

    const hadNewBool = hasField(settings, 'rsvp_paused')
    const hadNewMsg = hasField(settings, 'pause_message')

    if (!hasField(settings, 'season_over')) {
      settings.fields.add(
        new BoolField({
          id: 'bool_season_over',
          name: 'season_over',
          required: false,
          presentable: false,
          hidden: false,
          system: false,
        }),
      )
    }

    if (!hasField(settings, 'season_over_message')) {
      settings.fields.add(
        new TextField({
          id: 'text_season_msg',
          name: 'season_over_message',
          required: false,
          presentable: false,
          hidden: false,
          system: false,
          min: 0,
          max: 500,
          pattern: '',
          autogeneratePattern: '',
        }),
      )
    }

    app.save(settings)

    const records = app.findRecordsByFilter('app_settings', '', '', 200, 0)
    for (const rec of records) {
      const newBool = rec.get('rsvp_paused')
      const oldBool = rec.get('season_over')
      const newMsg = String(rec.get('pause_message') || '').trim()
      const oldMsg = String(rec.get('season_over_message') || '').trim()

      if (hadNewBool && newBool != null && !oldBool) {
        rec.set('season_over', !!newBool)
      }
      if (hadNewMsg && newMsg && !oldMsg) {
        rec.set('season_over_message', newMsg)
      }

      app.save(rec)
    }

    if (hadNewBool) settings.fields.removeByName('rsvp_paused')
    if (hadNewMsg) settings.fields.removeByName('pause_message')

    return app.save(settings)
  },
)

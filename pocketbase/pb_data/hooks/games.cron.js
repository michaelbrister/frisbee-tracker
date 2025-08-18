export default function (pb) {
  const { cronAdd } = pb

  cronAdd('createFrisbeeGame', '30 21 * * 4', async () => {
    // Check if cron is enabled in settings collection
    try {
      const setting = await pb.collection('settings').getFirstListItem('key="frisbee_cron"')
      if (!setting.value) {
        console.log('Frisbee cron disabled; skipping run.')
        return
      }
    } catch {
      console.log('No frisbee_cron setting found; assuming disabled.')
      return
    }

    const now = new Date()

    // Calculate next Friday 5:30PM Eastern (21:30 UTC)
    const nextFriday = new Date(now)
    nextFriday.setDate(now.getDate() + ((5 - now.getDay() + 7) % 7))
    nextFriday.setUTCHours(21, 30, 0, 0)

    const dateOnly = nextFriday.toISOString().split('T')[0]

    try {
      // Expire old games
      const expiredGames = await pb.collection('games').getFullList({
        filter: `active = true && date < "${now.toISOString()}"`,
      })

      for (const game of expiredGames) {
        await pb.collection('games').update(game.id, { active: false })
        console.log(`Expired old game: ${game.id}`)
      }

      // Check if game already exists for next Friday
      const existing = await pb
        .collection('games')
        .getFirstListItem(`title = "Frisbee" && date_only = "${dateOnly}"`, { requestKey: null })

      if (existing) {
        console.log(`Frisbee game for ${dateOnly} already exists. Skipping.`)
        return
      }
    } catch (err) {
      // This error happens if no record found, safe to ignore
      if (!err.isAbort) {
        console.error('Error checking existing games:', err)
        return
      }
      console.log('No existing game found, proceeding to create.')
    }

    // Create new Frisbee game
    try {
      await pb.collection('games').create({
        title: 'Frisbee',
        date: nextFriday.toISOString(),
        date_only: dateOnly,
        location: 'Bird Street Park',
        active: true,
      })

      console.log(`Created Frisbee game for ${dateOnly}`)
    } catch (err) {
      console.error('Failed to create Frisbee game:', err)
    }
  })
}

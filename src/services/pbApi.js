import pb from 'src/services/pocketbase'

function collection(name) {
  return pb.collection(name)
}

export const pbApi = {
  async fullList(name, options = {}) {
    return collection(name).getFullList(options)
  },

  async firstListItem(name, filter, options = {}) {
    return collection(name).getFirstListItem(filter, options)
  },

  async firstListItemOrNull(name, filter, options = {}) {
    try {
      return await collection(name).getFirstListItem(filter, options)
    } catch (err) {
      if (err?.status === 404) return null
      throw err
    }
  },

  async create(name, payload, options = {}) {
    return collection(name).create(payload, options)
  },

  async update(name, id, payload, options = {}) {
    return collection(name).update(id, payload, options)
  },

  async remove(name, id, options = {}) {
    return collection(name).delete(id, options)
  },
}

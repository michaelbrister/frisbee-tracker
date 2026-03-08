export function useQuasarDialogs($q) {
  function confirmDialog(options) {
    return new Promise((resolve) => {
      $q.dialog(options)
        .onOk(() => resolve(true))
        .onCancel(() => resolve(false))
        .onDismiss(() => resolve(false))
    })
  }

  function promptStringDialog(options) {
    return new Promise((resolve) => {
      $q.dialog(options)
        .onOk((val) => resolve(typeof val === 'string' ? val : ''))
        .onCancel(() => resolve(''))
        .onDismiss(() => resolve(''))
    })
  }

  function pickAction({ title, message = 'Choose an action', actions = [] }) {
    return new Promise((resolve) => {
      if ($q.bottomSheet) {
        $q.bottomSheet({ message: title, actions })
          .onOk((action) => resolve(action))
          .onCancel(() => resolve(null))
          .onDismiss(() => resolve(null))
        return
      }

      $q.dialog({
        title,
        message,
        position: $q.screen.lt.md ? 'bottom' : 'standard',
        cancel: true,
        persistent: true,
        options: {
          type: 'radio',
          model: null,
          items: actions.map((a) => ({ label: a.label, value: a.id, icon: a.icon })),
        },
      })
        .onOk((val) => resolve(val))
        .onCancel(() => resolve(null))
        .onDismiss(() => resolve(null))
    })
  }

  return {
    confirmDialog,
    promptStringDialog,
    pickAction,
  }
}

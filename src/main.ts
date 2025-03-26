import './style.css'
import App from './App.vue'
import { createApp } from 'vue'
import { createHead } from '@unhead/vue'

// Font Awesome setup
import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { fas } from '@fortawesome/free-solid-svg-icons'
import { far } from '@fortawesome/free-regular-svg-icons'
import { fab } from '@fortawesome/free-brands-svg-icons'
import { faMap } from '@fortawesome/free-solid-svg-icons'

// Add all icon libraries
library.add(fas, far, fab, faMap)

const app = createApp(App)
const head = createHead()

// Register Font Awesome component globally
app.component('font-awesome-icon', FontAwesomeIcon)

app.use(head)
app.mount("#app")

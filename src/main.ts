import './style.css'
import App from './App.vue'
import { createApp } from 'vue'
import { createHead } from '@unhead/vue'

// Font Awesome setup
import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { 
  faMessage, faSun, faMoon, faQuestionCircle, faTrash,
  faUser, faRobot, faPaperPlane, faCheckCircle, faBookmark,
  faHeart, faPaperclip, faEye, faHand, faCompass, faSmile,
  faList, faMinus, faStar, faTag, faChevronLeft, faChevronRight,
  faFileAlt, faInfoCircle, faReply, faRedo, faHome, faSync,
  faClock, faSpinner, faRoute, faTimes, faComment, faLightbulb,
  faArrowLeft, faBrain, faCloudRain, faLock, faBolt, faExclamationCircle, 
  faCommentSlash, faTasks, faBook
} from '@fortawesome/free-solid-svg-icons'

// Add all icons to the library
library.add(
  faMessage, faSun, faMoon, faQuestionCircle, faTrash,
  faUser, faRobot, faPaperPlane, faCheckCircle, faBookmark,
  faHeart, faPaperclip, faEye, faHand, faCompass, faSmile,
  faList, faMinus, faStar, faTag, faChevronLeft, faChevronRight,
  faFileAlt, faInfoCircle, faReply, faRedo, faHome, faSync,
  faClock, faSpinner, faRoute, faTimes, faComment, faLightbulb,
  faArrowLeft, faBrain, faCloudRain, faLock, faBolt, faExclamationCircle,
  faCommentSlash, faTasks, faBook
)

const app = createApp(App)
const head = createHead()

// Register Font Awesome component globally
app.component('font-awesome-icon', FontAwesomeIcon)

app.use(head)
app.mount("#app")

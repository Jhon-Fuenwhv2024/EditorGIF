import { handleFetchVideo } from '../../shared/api-handlers'

export const onRequest: PagesFunction = async (context) => {
  return handleFetchVideo(context.request)
}

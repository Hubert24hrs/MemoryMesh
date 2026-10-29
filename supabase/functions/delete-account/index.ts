// Permanently delete the caller's account: vectors first, then the auth user
// (all rows cascade via foreign keys).

import { HttpError, serve } from '../_shared/http.ts';
import { deleteNamespace } from '../_shared/pinecone.ts';

serve(async (_req, ctx) => {
  try {
    await deleteNamespace(ctx.userId);
  } catch (error) {
    if (!(error instanceof Error && error.message.includes('not configured'))) {
      console.error(error);
      throw new HttpError(502, 'Could not delete search index; please try again', 'vector_delete_failed');
    }
  }
  const { error } = await ctx.admin.auth.admin.deleteUser(ctx.userId);
  if (error) throw new HttpError(500, 'Could not delete account', 'delete_failed');
  return { deleted: true };
});

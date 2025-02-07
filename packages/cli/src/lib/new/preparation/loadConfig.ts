/*
 * Copyright 2025 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import fs from 'fs-extra';
import { paths } from '../../paths';
import { defaultTemplates } from '../defaultTemplates';
import { NewConfig } from '../types';
import { z } from 'zod';
import { fromZodError } from 'zod-validation-error';
import { ForwardedError } from '@backstage/errors';

const defaultGlobals = {
  license: 'Apache-2.0',
  baseVersion: '0.1.0',
  private: true,
};

const pkgJsonWithNewConfigSchema = z.object({
  backstage: z
    .object({
      new: z
        .object({
          templates: z
            .array(
              z
                .object({
                  id: z.string(),
                  target: z.string(),
                })
                .strict(),
            )
            .optional(),
          globals: z
            .record(z.union([z.string(), z.number(), z.boolean()]))
            .optional(),
        })
        .strict()
        .optional(),
    })
    .optional(),
});

type LoadConfigOptions = {
  packagePath?: string;
  globalOverrides?: Record<string, string | number | boolean>;
};

export async function loadConfig(
  options: LoadConfigOptions = {},
): Promise<NewConfig> {
  const pkgPath =
    options.packagePath ?? paths.resolveTargetRoot('package.json');
  const pkgJson = await fs.readJson(pkgPath);

  const parsed = pkgJsonWithNewConfigSchema.safeParse(pkgJson);
  if (!parsed.success) {
    throw new ForwardedError(
      `Failed to load templating configuration from '${pkgPath}'`,
      fromZodError(parsed.error),
    );
  }

  const newConfig = parsed.data.backstage?.new;

  return {
    isUsingDefaultTemplates: !newConfig?.templates,
    templatePointers: newConfig?.templates ?? defaultTemplates,
    globals: {
      ...defaultGlobals,
      ...newConfig?.globals,
      ...options.globalOverrides,
    },
  };
}

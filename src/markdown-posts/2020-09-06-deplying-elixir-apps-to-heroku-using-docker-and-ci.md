---
slug: deplying-elixir-apps-to-heroku-using-docker-and-ci
title: Deploying Elixir apps to heroku using docker and CI
date: 2020-09-06
---

This post will show in simple steps how you can deliver your Elixir + Phoenix app to Heroku using your own docker imagem, rather than pushing your code using git and waiting for a buildpack to build it for you.

Also, this post will give youn an example on how to configure Github Actions to test and deploy your code.

## Creating an Application

To create your new app, you must have elixir installed ([tutorial](https://elixir-lang.org/install.html)) and also the archive for phoenix ([tutorial](https://hexdocs.pm/phoenix/installation.html)).

```bash
mix phx.new my_app
```

Now enter your new app folder and install dependencies (if you haven't already did it during creation).

```bash
cd my_app
mix deps.get && npm install --prefix assets
```

And then publish it to your github account (remember to create a repository [here](https://github.com/new)):

```bash
git init
# remember to replace remote with your repo url
git remote add origin git@github.com:YOUR_USERNAME/my_app.git
git add --all
git commit -m 'chore: phoenix init'
git push origin master
```

## Configuring Github Actions

To test and deploy your app, I recommend using [Github Actions](https://github.com/features/actions). It runs as other continuous integration softwares, but for me it seems to be simpler since it is part of the repository on Github.

To setup a workflow for testing, create the following file at `.github/workflows/elixir.yml` with the following content:

```yml
name: Elixir
on:
  push:
    branches: "**"
jobs:
  test:
    runs-on: ubuntu-latest
    container:
      image: elixir:1.9.4
    services:
      postgres:
        image: postgres
        env:
          POSTGRES_USER: postgres
          POSTGRES_DB: my_app_test
          POSTGRES_PASSWORD: postgres
        ports:
          - 5432/tcp
    steps:
    - uses: actions/checkout@v1
    - name: Setup deps caching
      id: deps_cache
      uses: actions/cache@v1
      with:
        path: deps
        key: ${{ runner.os }}-deps-${{ hashFiles('**/mix.lock') }}
        restore-keys: |
          ${{ runner.os }}-deps-
    - name: Setup _build caching
      id: build_cache
      uses: actions/cache@v1
      with:
        path: _build
        key: ${{ runner.os }}-build-${{ github.sha }}
        restore-keys: |
          ${{ runner.os }}-build-
    - name: Install Dependencies
      run: |
        mix local.rebar --force
        mix local.hex --force
        mix deps.get
        mix deps.compile
      env:
        MIX_ENV: test
    - name: Run Dialyzer Analysis
      run: mix dialyzer --format short
    - name: Check code Format
      run: mix format --check-formatted --dry-run
    - name: Run code Analysis
      run: mix credo --strict
    - name: Setup Database
      run: |
        mix ecto.create
        mix ecto.migrate
      env:
        MIX_ENV: test
        DATABASE_HOSTNAME: postgres
    - name: Run tests with coverage
      run: mix test --cover --raise
      env:
        MIX_ENV: test
        DATABASE_HOSTNAME: postgres
    - name: Save coverage report
      uses: actions/upload-artifact@v2
      with:
        name: test_coverage_report
        path: cover/
```

Now change your `mix.exs` to include dependencies that are missing for our CI script:

```elixir
# replace elixir's version to which one you're using (currently mine is 1.9.4)
# and also add dialyxir (dialyzer) config
def project do
  [
    ...
    elixir: "~> 1.9"
    ...
    dialyzer: [
      plt_add_apps: [
        :ex_unit,
        :mix,
        :erts,
        :phoenix_pubsub,
        :ecto,
        :telemetry
      ],
      list_unused_filters: true
    ]
  ]
end

# and add the following lines to your deps list
defp deps do
 [
   ...
   {:credo, "~> 1.4.0", only: [:dev, :test], runtime: false},
   {:dialyxir, "~> 1.0.0", runtime: false, allow_pre: false, only: [:dev, :test]}
 ]
end
```

Now run dependencies download again:

```bash
mix deps.get
```

At last, just make a little changes into your testing config file (`config/test.exs`) to run with CI

```elixir
config :my_app, MyApp.Repo,
  username: "postgres",
  password: "postgres",
  database: "my_app_test#{System.get_env("MIX_TEST_PARTITION")}",
  # just changed hostname to fetch from env vars
  hostname: System.get_env("DATABASE_HOSTNAME", "localhost"),
  pool: Ecto.Adapters.SQL.Sandbox
```

**Important**: Since the first CI run won't have any cache, it will probably take a long time to finish (mainly because of dialyzer), but for next times it will be better.

Now, before pushing these changes to Github, make sure your code is formatted (`mix format`) and check if are any credo fixes to do (`mix credo --strict`) - and there were some design suggestions to implement.

Then push everything:
```bash
git add --all
git commit -m 'chore: github actions'
git push origin master
```

You can check your action status under "Actions" on your Github repository. Also, after finished, there is an "Artifacts" section under a run that shows the test coverage report.

## Configuring the release

Now it is time to configure our application to be deployed. It includes setting up the release and the docker file.

To start, generate release config files:

```bash
mix release.init
```

Now, delete the file `config/prod.secret.exs` and remove its usage from `config/prod.exs` where it is written something like `import_config "prod.secret.exs"`.

The next step is to create a file named `config/releases.exs`. This file will only be evaluated on release environment and not while you run using mix, for example (and as I know, this kind of configuration will change by elixir 1.11). Inside this file, put the following content:

```elixir
import Config

database_url =
  System.get_env("DATABASE_URL") ||
    raise """
    environment variable DATABASE_URL is missing.
    For example: ecto://USER:PASS@HOST/DATABASE
    """

# TODO: replace :my_app and MyApp with your app's config
config :my_app, MyApp.Repo,
  url: database_url,
  pool_size: String.to_integer(System.get_env("POOL_SIZE") || "10")

secret_key_base =
  System.get_env("SECRET_KEY_BASE") ||
    raise """
    environment variable SECRET_KEY_BASE is missing.
    You can generate one by calling: mix phx.gen.secret
    """

# TODO: replace :my_app and MyAppWeb with your app's config
config :my_app, MyAppWeb.Endpoint,
  url: [host: System.get_env("PROJECT_URL"), port: 80],
  http: [
    port: String.to_integer(System.get_env("PORT") || "4000"),
    transport_options: [socket_opts: [:inet6]]
  ],
  secret_key_base: secret_key_base,
  server: true
```

Now, create a dockerfile at root (`Dockerfile`) with the following content:

```dockerfile
FROM elixir:1.9.4-alpine as build

ARG MIX_ENV=prod
ENV MIX_ENV=${MIX_ENV}

# IMPORTANT: Replace with your own timezone
RUN apk add -U --no-cache bash git build-base gcc make tzdata ca-certificates nodejs npm \
    && cp /usr/share/zoneinfo/America/Sao_Paulo /etc/localtime \
    && echo "America/Sao_Paulo" > /etc/timezone

ARG HOME="/app"

RUN mkdir -p ${HOME}/src
WORKDIR ${HOME}/src

COPY mix.exs mix.lock ${HOME}/src/
COPY config/ ${HOME}/src/config

RUN mix local.hex --force && mix local.rebar --force

RUN mix deps.get && \
    mix deps.compile

COPY assets/ ${HOME}/src/assets

RUN cd assets && \
    npm install && \
    npm rebuild node-sass && \
    cd -

ENV PATH=./node_modules/.bin:$PATH

RUN cd assets/ && \
    npm run deploy && cd -

COPY lib/ ${HOME}/src/lib
COPY priv/ ${HOME}/src/priv

RUN mix compile && \
    mix phx.digest && \
    mix release

# ---------------------------------------------------------
# Run Release
# ---------------------------------------------------------
FROM alpine:3.11.6

ARG HOME="/app"

RUN apk add -U --no-cache bash ncurses-libs openssl tzdata

# IMPORTANT: Replace with your own timezone
RUN cp /usr/share/zoneinfo/America/Sao_Paulo /etc/localtime && \
    echo "America/Sao_Paulo" > /etc/timezone

# TODO: Replace "my_app" with your application's name
COPY --from=build /app/src/_build/prod/rel/my_app /app/.

ENV MIX_ENV=${MIX_ENV}

# TODO: Replace "my_app" with your application's name
CMD /app/bin/my_app start
```

And then commit your changes to github:

```bash
git add --all
git commit -m 'chore: release setup'
git push origin master
```

## Creating a Heroku app

You now need some configuration on Heroku to have your app correctly configured. It is possible doing only by their website panel, but I will list below all the commands needed to do it by console using [heroku-cli](https://devcenter.heroku.com/articles/heroku-cli).

```bash
heroku login
heroku apps:create # will generate a random name if you don't provide one (globally unique)
heroku config:set POOL_SIZE=10
heroku config:set SECRET_KEY_BASE=$(mix phx.gen.secret)
# the command below gets the hostname from project url
# and the system will use it as base for url generation
heroku config:set PROJECT_URL=$(heroku info -s | grep web_url | cut -d= -f2 | cut -d/ -f3)
heroku addons:create heroku-postgresql:hobby-dev
```

Just an additional comment: we've set some environment variables, but we didn't provide both "DATABASE\_URL" and "PORT" used on our `releases.exs` config. "DATABASE\_URL" is automatically inserted by the postgresql addon we've added and "PORT" is given by Heroku on each run (so if you set one, probably your app won't run).

You can visit your app by running the command `heroku open` and you will see a default page generated by them.

## Updating the CI Action

All the groundwork is ready to support our deploys (Docker configuration and Heroku setup). The only part needed now is to add one more step into the CI's file.
One specification is that we're going to trigger deploys only when there is a push to the `master` branch, and all other branches will only run the test flow.

```yml
jobs:
  test:
    ... # the code you already have
  deploy-homolog:
    if: github.ref == 'refs/heads/master' # filters pushes only on master
    needs: test # runs only after tests
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v1
    - uses: akhileshns/heroku-deploy@v3.0.4
      with:
        heroku_email: ${{ secrets.HEROKU_EMAIL }}
        heroku_api_key: ${{ secrets.HEROKU_API_KEY }}
        heroku_app_name: ${{ secrets.HEROKU_APP_NAME }}
        usedocker: true
```

You noticed that there are some `secrets` variables being interpolated into the action. To setup it, go to your Github repository, open "Settings" and then "Secrets". Create these values:
- HEROKU_EMAIL - the email address related to your Heroku account;
- HEROKU_APP_NAME - your app's name that is part of your url or you can confirm it by running `heroku apps:info` and see the first line (or just run `heroku apps:info | grep '===' | cut -d' ' -f2` that cuts it for you);
- HEROKU_API_KEY - run `heroku authorizations:create` on your console and get the "Token:" value.

Now you are ready to deploy what is on your `master` branch. Just commit the changes made into CI's file:

```bash
git add --all
git commit -m 'refactor: ci deploy'
git push origin master
```

Just wait for CI to complete and visit your website again by running `heroku open`.

## And what about migrations?

Just one piece is missing: since the code is being packaged by `mix release`, you don't have a command to run migrations inside your server. It is needed to create an elixir module that run migrations. And since we're going to create that, why not let migrations to run automatically after a deploy?

I tried two options for it: the first one is to put a script on the server that runs the migration and then starts the server. And another one that is call the migration remotely from CI. I choose this last one because, since heroku stops your free server after 30mins and starts again when someone opens the url, it would take more time for this startup if migrations were run all the times.

To start, create this module at your app's folder (mine is "my_app") `lib/my_app/commands/release_tasks.ex`:

```elixir
defmodule MyApp.Command.ReleaseTasks do
  @moduledoc false

  def migrate do
    # TODO: rename :my_app to your app's name
    {:ok, _} = Application.ensure_all_started(:my_app)

    # TODO: rename :my_app to your app's name
    path = Application.app_dir(:my_app, "priv/repo/migrations")

    # TODO: rename MyApp to your project's module
    Ecto.Migrator.run(MyApp.Repo, path, :up, all: true)

    :init.stop()
  end
end
```

Then create an alias to this module's command as a executable file that will be on the container. Put the following content into a file named `rel/bin/migrate` (no extension):

```sh
#!/bin/sh

# TODO: replace my_app and MyApp to your app's name
/app/bin/my_app eval 'MyApp.Command.ReleaseTasks.migrate()'
```

Now, update your Dockerfile last step (the runner) to copy all files inside `/rel/bin` into container's `/app/bin/` (for example, your app's release entrypoint goes to this folder): 

```Dockerfile
...
# below this line
COPY --from=build /app/src/_build/prod/rel/my_app /app/.
# insert this
COPY rel/bin/ /app/bin/
```

Finally, just update the last step of your workflow (file present at `.github/workflows/elixir.yml`) to run this new command directly on the deployed container using heroku cli:

```yml
jobs:
  deploy-homolog:
    ...
    # place it as the last step (after the "heroku-deploy" action)
    - name: Run Migrations
      run: heroku run bash '/app/bin/migrate' --app ${{ secrets.HEROKU_APP_NAME }} --type=worker
      env:
        HEROKU_API_KEY: ${{ secrets.HEROKU_API_KEY }}
```

Commit the code and wait your next migrations will automatically run!

```shell
git add --all
git commit -m 'chore: run migrations'
git push origin master
```

## Further improvements

You can check the full code hosted at this repository: [https://github.com/duzzifelipe/my_elixir_and_heroku_app_example](https://github.com/duzzifelipe/my_elixir_and_heroku_app_example).

There are some specifications that I didn't conver on this post and maybe they will a great point for improvement:
 - first of all, there is only one deploy target (that I named homolog). But it could have another step to deploy to production when a release is created, for example;
 - I have explained why I prefered to run migrations from CI rather than on container startup, but it could be a problem for production apps, since the new container will replace the old one before the migration runs (and the app will be crashed until it). I found that heroku offers a similar feature to blue-green deployments (https://devcenter.heroku.com/articles/preboot) and this could be applied on this project.

Thats it!